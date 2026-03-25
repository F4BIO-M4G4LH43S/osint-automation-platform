#!/usr/bin/env python3
"""
Shodan OSINT Module
Internet-facing asset discovery and vulnerability assessment
"""

import shodan
import asyncio
from typing import List, Dict, Any, Optional
from datetime import datetime

from osint_platform.core.config_manager import ConfigManager


class ShodanModule:
    """Shodan integration for internet-facing asset discovery"""
    
    def __init__(self, config: ConfigManager):
        self.config = config
        self.enabled = False
        self.description = "Internet search engine for exposed devices and services"
        self.version = "1.0.0"
        self.required_config = ['api_keys.shodan.key']
        
        # Initialize API client
        api_key = config.get('api_keys.shodan.key')
        if api_key and api_key != "YOUR_SHODAN_API_KEY":
            try:
                self.api = shodan.Shodan(api_key)
                self.enabled = True
            except Exception as e:
                print(f"Shodan initialization failed: {e}")
                
    async def scan(self, target: str, **options) -> List[Dict[str, Any]]:
        """
        Execute Shodan scan against target
        
        Args:
            target: Domain, IP, or network range
            options: Additional search filters
            
        Returns:
            List of finding dictionaries
        """
        if not self.enabled:
            return [{'error': 'Shodan module not enabled or API key invalid'}]
            
        findings = []
        
        # Determine search strategy based on target type
        if self._is_ip(target):
            findings.extend(await self._search_ip(target, options))
        elif self._is_network(target):
            findings.extend(await self._search_network(target, options))
        else:
            # Domain search
            findings.extend(await self._search_domain(target, options))
            findings.extend(await self._search_ssl(target, options))
            
        return findings
        
    async def _search_ip(self, ip: str, options: Dict) -> List[Dict]:
        """Search for specific IP address"""
        try:
            host = self.api.host(ip)
            
            finding = {
                'type': 'shodan_host',
                'ip': ip,
                'hostnames': host.get('hostnames', []),
                'org': host.get('org'),
                'isp': host.get('isp'),
                'asn': host.get('asn'),
                'os': host.get('os'),
                'ports': [],
                'vulnerabilities': [],
                'tags': host.get('tags', []),
                'last_update': host.get('last_update')
            }
            
            # Process services
            for service in host.get('data', []):
                port_info = {
                    'port': service.get('port'),
                    'transport': service.get('transport'),
                    'product': service.get('product'),
                    'version': service.get('version'),
                    'banner': service.get('data', '')[:500],  # Truncate
                    'cpe': service.get('cpe', []),
                    'timestamp': service.get('timestamp')
                }
                finding['ports'].append(port_info)
                
            # Process vulnerabilities
            for vuln in host.get('vulns', []):
                vuln_info = {
                    'cve': vuln,
                    'verified': host['vulns'][vuln].get('verified', False),
                    'cvss': host['vulns'][vuln].get('cvss'),
                    'summary': host['vulns'][vuln].get('summary', '')[:200]
                }
                finding['vulnerabilities'].append(vuln_info)
                
            return [finding]
            
        except shodan.APIError as e:
            return [{'error': f'Shodan API error: {str(e)}'}]
            
    async def _search_network(self, cidr: str, options: Dict) -> List[Dict]:
        """Search network range"""
        query = f"net:{cidr}"
        
        # Add filters from options
        if options.get('port'):
            query += f" port:{options['port']}"
        if options.get('product'):
            query += f" product:{options['product']}"
            
        return await self._execute_search(query, options)
        
    async def _search_domain(self, domain: str, options: Dict) -> List[Dict]:
        """Search by hostname"""
        query = f"hostname:{domain}"
        return await self._execute_search(query, options)
        
    async def _search_ssl(self, domain: str, options: Dict) -> List[Dict]:
        """Search SSL certificate information"""
        query = f"ssl.cert.subject.cn:{domain}"
        return await self._execute_search(query, options)
        
    async def _execute_search(
        self,
        query: str,
        options: Dict,
        limit: int = 100
    ) -> List[Dict]:
        """Execute Shodan search with pagination"""
        findings = []
        
        try:
            # Get total count
            result = self.api.search(query, limit=1)
            total = result['total']
            
            # Paginate results
            page = 1
            per_page = min(100, options.get('limit', 100))
            
            while len(findings) < min(total, per_page):
                results = self.api.search(query, page=page)
                
                for match in results['matches']:
                    finding = {
                        'type': 'shodan_service',
                        'ip': match.get('ip_str'),
                        'port': match.get('port'),
                        'hostnames': match.get('hostnames', []),
                        'product': match.get('product'),
                        'version': match.get('version'),
                        'cpe': match.get('cpe', []),
                        'timestamp': match.get('timestamp'),
                        'query': query
                    }
                    findings.append(finding)
                    
                page += 1
                if page > 10:  # Safety limit
                    break
                    
            return findings
            
        except shodan.APIError as e:
            return [{'error': f'Search failed: {str(e)}'}]
            
    def _is_ip(self, target: str) -> bool:
        """Check if target is IP address"""
        import ipaddress
        try:
            ipaddress.ip_address(target)
            return True
        except ValueError:
            return False
            
    def _is_network(self, target: str) -> bool:
        """Check if target is network range"""
        import ipaddress
        try:
            ipaddress.ip_network(target, strict=False)
            return True
        except ValueError:
            return False
