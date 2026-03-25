#!/usr/bin/env python3
"""
OSINT Platform Core Engine
Main orchestration and workflow management
"""

import asyncio
import importlib
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional, Type
from dataclasses import dataclass, field
from concurrent.futures import ThreadPoolExecutor, as_completed

from osint_platform.core.config_manager import ConfigManager
from osint_platform.core.logger import setup_logging
from osint_platform.database.repository import OSINTRepository


@dataclass
class ScanResult:
    """Standardized scan result container"""
    module: str
    target: str
    timestamp: datetime
    status: str  # success, error, partial
    findings: List[Dict[str, Any]] = field(default_factory=list)
    errors: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)
    execution_time: float = 0.0


@dataclass
class ScanTask:
    """Individual scan task definition"""
    target: str
    module: str
    options: Dict[str, Any] = field(default_factory=dict)
    priority: int = 5  # 1-10, lower is higher priority


class OSINTEngine:
    """
    Main OSINT orchestration engine
    Manages module loading, execution, and result aggregation
    """
    
    def __init__(self, config_path: Optional[str] = None):
        self.config = ConfigManager(config_path)
        self.logger = setup_logging(self.config.get('platform.log_level', 'INFO'))
        self.repository = OSINTRepository(self.config.get('database'))
        self.modules: Dict[str, Any] = {}
        self.executor = ThreadPoolExecutor(
            max_workers=self.config.get('scanning.max_workers', 10)
        )
        
        self._load_modules()
        
    def _load_modules(self):
        """Dynamically load available OSINT modules"""
        module_configs = {
            'shodan': 'osint_platform.modules.shodan_module.ShodanModule',
            'virustotal': 'osint_platform.modules.virustotal_module.VirusTotalModule',
            'crtsh': 'osint_platform.modules.crtsh_module.CrtShModule',
            'dns': 'osint_platform.modules.dns_module.DNSModule',
            'whois': 'osint_platform.modules.whois_module.WhoisModule',
            'webscraper': 'osint_platform.modules.webscraper_module.WebScraperModule',
            'wordpress': 'osint_platform.modules.wordpress_module.WordPressModule',
        }
        
        for name, class_path in module_configs.items():
            try:
                module_path, class_name = class_path.rsplit('.', 1)
                module = importlib.import_module(module_path)
                module_class = getattr(module, class_name)
                
                # Initialize with config
                instance = module_class(self.config)
                self.modules[name] = instance
                self.logger.info(f"Loaded module: {name}")
                
            except Exception as e:
                self.logger.warning(f"Failed to load module {name}: {e}")
                
    async def execute_scan(
        self,
        target: str,
        modules: Optional[List[str]] = None,
        options: Optional[Dict[str, Any]] = None
    ) -> List[ScanResult]:
        """
        Execute comprehensive scan against target
        
        Args:
            target: Domain, IP, or URL to scan
            modules: List of module names (None = all enabled)
            options: Additional scan options
            
        Returns:
            List of ScanResult objects
        """
        self.logger.info(f"Starting scan of {target}")
        
        # Determine which modules to run
        if modules is None:
            modules = self.config.get('scanning.default_modules', ['dns', 'whois'])
            
        # Filter to available modules
        available_modules = [m for m in modules if m in self.modules]
        
        if not available_modules:
            self.logger.error("No valid modules available for scan")
            return []
            
        # Create scan tasks
        tasks = [
            ScanTask(target=target, module=module, options=options or {})
            for module in available_modules
        ]
        
        # Execute scans concurrently
        results = await self._execute_tasks(tasks)
        
        # Store results
        await self._store_results(results)
        
        # Send notifications if configured
        await self._send_notifications(results)
        
        return results
        
    async def _execute_tasks(self, tasks: List[ScanTask]) -> List[ScanResult]:
        """Execute scan tasks with concurrency control"""
        results = []
        
        # Use semaphore to limit concurrent scans
        semaphore = asyncio.Semaphore(
            self.config.get('scanning.max_workers', 5)
        )
        
        async def execute_with_limit(task: ScanTask) -> ScanResult:
            async with semaphore:
                return await self._run_module(task)
                
        # Gather all tasks
        coroutines = [execute_with_limit(task) for task in tasks]
        results = await asyncio.gather(*coroutines, return_exceptions=True)
        
        # Handle exceptions
        processed_results = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                self.logger.error(f"Task {tasks[i].module} failed: {result}")
                processed_results.append(ScanResult(
                    module=tasks[i].module,
                    target=tasks[i].target,
                    timestamp=datetime.utcnow(),
                    status="error",
                    errors=[str(result)]
                ))
            else:
                processed_results.append(result)
                
        return processed_results
        
    async def _run_module(self, task: ScanTask) -> ScanResult:
        """Execute single module scan"""
        module = self.modules.get(task.module)
        if not module:
            return ScanResult(
                module=task.module,
                target=task.target,
                timestamp=datetime.utcnow(),
                status="error",
                errors=[f"Module {task.module} not found"]
            )
            
        start_time = datetime.utcnow()
        
        try:
            self.logger.info(f"Running {task.module} against {task.target}")
            
            # Run module scan (async or sync)
            if asyncio.iscoroutinefunction(module.scan):
                findings = await module.scan(task.target, **task.options)
            else:
                # Run sync function in thread pool
                loop = asyncio.get_event_loop()
                findings = await loop.run_in_executor(
                    self.executor,
                    module.scan,
                    task.target,
                    **task.options
                )
                
            execution_time = (datetime.utcnow() - start_time).total_seconds()
            
            return ScanResult(
                module=task.module,
                target=task.target,
                timestamp=start_time,
                status="success",
                findings=findings if isinstance(findings, list) else [findings],
                execution_time=execution_time
            )
            
        except Exception as e:
            self.logger.error(f"Module {task.module} failed: {e}")
            return ScanResult(
                module=task.module,
                target=task.target,
                timestamp=start_time,
                status="error",
                errors=[str(e)],
                execution_time=(datetime.utcnow() - start_time).total_seconds()
            )
            
    async def _store_results(self, results: List[ScanResult]):
        """Store scan results in database"""
        for result in results:
            try:
                await self.repository.store_scan_result(result)
            except Exception as e:
                self.logger.error(f"Failed to store result: {e}")
                
    async def _send_notifications(self, results: List[ScanResult]):
        """Send notifications for high-severity findings"""
        # Implementation depends on notification config
        pass
        
    def get_module_info(self) -> Dict[str, Dict]:
        """Get information about loaded modules"""
        info = {}
        for name, module in self.modules.items():
            info[name] = {
                'enabled': getattr(module, 'enabled', True),
                'description': getattr(module, 'description', 'No description'),
                'version': getattr(module, 'version', 'unknown'),
                'config_required': getattr(module, 'required_config', [])
            }
        return info
        
    async def compare_scans(
        self,
        target: str,
        date1: datetime,
        date2: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        Compare scan results over time to detect changes
        """
        if date2 is None:
            date2 = datetime.utcnow()
            
        scan1 = await self.repository.get_scan_by_date(target, date1)
        scan2 = await self.repository.get_scan_by_date(target, date2)
        
        if not scan1 or not scan2:
            return {'error': 'One or both scans not found'}
            
        # Compare findings
        changes = {
            'new_findings': [],
            'removed_findings': [],
            'modified_findings': []
        }
        
        # Implementation of diff logic
        # ...
        
        return changes
        
    def generate_report(
        self,
        results: List[ScanResult],
        format: str = 'json'
    ) -> str:
        """
        Generate formatted report from scan results
        """
        from osint_platform.utils.formatters import ReportFormatter
        
        formatter = ReportFormatter(format)
        return formatter.generate(results)
        
    def close(self):
        """Cleanup resources"""
        self.executor.shutdown(wait=True)
        self.repository.close()
