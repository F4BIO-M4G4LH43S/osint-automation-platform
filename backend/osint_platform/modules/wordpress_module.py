#!/usr/bin/env python3
"""
WordPress Security Module
Specialized OSINT for WordPress attack surface assessment
"""

import re
import json
import asyncio
import aiohttp
from typing import List, Dict, Any, Optional
from urllib.parse import urljoin, urlparse

from osint_platform.core.config_manager import ConfigManager


class WordPressModule:
    """WordPress-specific security assessment module"""
    
    def __init__(self, config: ConfigManager):
        self.config = config
        self.enabled = True
        self.description = "WordPress attack surface discovery and vulnerability assessment"
        self.version = "1.0.0"
        self.session = None
        
        # WordPress fingerprinting signatures
        self.signatures = {
            'generator_meta': r'<meta[^>]+name=["\']generator["\'][^>]+content=["\']WordPress[^"\']*["\']',
            'wp_includes': r'/wp-includes/',
            'wp_content': r'/wp-content/(?:themes|plugins)/',
            'rest_api': r'/wp-json/wp/v2/',
            'xmlrpc': r'/xmlrpc\.php',
            'admin': r'/wp-admin|wp-login\.php'
        }
        
        # Common vulnerable plugins (2024-2025)
        self.vulnerable_plugins = {
            'elementor': ['3.21.0', 'CVE-2024-XXXX'],
            'wpforms-lite': ['1.9.2.2', 'CVE-2024-11465'],
            'wordpress-popular-posts': ['7.1.0', 'CVE-2024-11733'],
            'backup-migration': ['1.4.5', 'CVE-2024-10932'],
            'ninja-forms': ['3.8.22', 'CVE-2024-12238'],
            'multi-uploader-for-gravity-forms': ['1.1.3', 'CVE-2025-23921']
        }
        
    async def scan(self, target: str, **options) -> List[Dict[str, Any]]:
        """
        Comprehensive WordPress security scan
        
        Args:
            target: URL or domain to scan
            options: 
                - aggressive: bool (default False) - Active enumeration
                - check_vulns: bool (default True) - Check vulnerability databases
                - enumerate_users: bool (default False) - Enumerate WP users
                
        Returns:
            List of security findings
        """
        findings = []
        
        # Normalize URL
        url = self._normalize_url(target)
        
        # Initialize session
        async with aiohttp.ClientSession() as session:
            self.session = session
            
            # 1. WordPress detection
            wp_detected = await self._detect_wordpress(url)
            if not wp_detected:
                return [{'type': 'info', 'message': 'WordPress not detected'}]
                
            findings.append({
                'type': 'wordpress_detected',
                'url': url,
                'confidence': wp_detected['confidence'],
                'version': wp_detected.get('version'),
                'evidence': wp_detected['evidence']
            })
            
            # 2. Version fingerprinting
            version = await self._get_version(url)
            if version:
                findings.append({
                    'type': 'wordpress_version',
                    'version': version,
                    'vulnerable': self._check_version_vulnerable(version)
                })
                
            # 3. Plugin enumeration
            if options.get('aggressive', False):
                plugins = await self._enumerate_plugins(url)
                findings.extend(plugins)
                
            # 4. Theme enumeration
            themes = await self._enumerate_themes(url)
            findings.extend(themes)
            
            # 5. Security configuration checks
            security_checks = await self._security_checks(url)
            findings.extend(security_checks)
            
            # 6. API endpoint exposure
            api_exposure = await self._check_api_exposure(url)
            findings.extend(api_exposure)
            
            # 7. User enumeration (if enabled)
            if options.get('enumerate_users', False):
                users = await self._enumerate_users(url)
                findings.extend(users)
                
        return findings
        
    async def _detect_wordpress(self, url: str) -> Optional[Dict]:
        """Detect WordPress installation"""
        evidence = []
        confidence = 0
        
        try:
            async with self.session.get(url, timeout=10, ssl=False) as response:
                text = await response.text()
                
                # Check generator meta
                if re.search(self.signatures['generator_meta'], text, re.IGNORECASE):
                    evidence.append('generator_meta_tag')
                    confidence += 40
                    
                    # Extract version
                    version_match = re.search(
                        r'WordPress\s+(\d+\.\d+(?:\.\d+)?)',
                        text
                    )
                    if version_match:
                        return {
                            'confidence': confidence,
                            'version': version_match.group(1),
                            'evidence': evidence
                        }
                        
                # Check wp-includes
                if re.search(self.signatures['wp_includes'], text):
                    evidence.append('wp-includes_reference')
                    confidence += 30
                    
                # Check wp-content
                if re.search(self.signatures['wp_content'], text):
                    evidence.append('wp-content_reference')
                    confidence += 30
                    
                # Check for wp-login.php
                login_url = urljoin(url, 'wp-login.php')
                async with self.session.get(login_url, timeout=5, ssl=False) as login_resp:
                    if login_resp.status == 200 and 'wp-submit' in await login_resp.text():
                        evidence.append('wp-login_found')
                        confidence += 40
                        
                if confidence > 0:
                    return {
                        'confidence': min(confidence, 100),
                        'evidence': evidence
                    }
                    
        except Exception as e:
            pass
            
        return None
        
    async def _get_version(self, url: str) -> Optional[str]:
        """Determine WordPress version through multiple methods"""
        
        # Method 1: Generator meta (already checked)
        
        # Method 2: readme.html
        try:
            readme_url = urljoin(url, 'readme.html')
            async with self.session.get(readme_url, timeout=5, ssl=False) as resp:
                if resp.status == 200:
                    text = await resp.text()
                    match = re.search(r'Version\s+(\d+\.\d+(?:\.\d+)?)', text)
                    if match:
                        return match.group(1)
        except:
            pass
            
        # Method 3: Feed
        try:
            feed_url = urljoin(url, 'feed/')
            async with self.session.get(feed_url, timeout=5, ssl=False) as resp:
                if resp.status == 200:
                    text = await resp.text()
                    match = re.search(r'wordpress\.org/\?v=(\d+\.\d+(?:\.\d+)?)', text)
                    if match:
                        return match.group(1)
        except:
            pass
            
        # Method 4: CSS/JS version strings
        try:
            async with self.session.get(url, timeout=5, ssl=False) as resp:
                text = await resp.text()
                matches = re.findall(r'wp-emoji-release\.min\.js\?ver=(\d+\.\d+(?:\.\d+)?)', text)
                if matches:
                    return matches[0]
        except:
            pass
            
        return None
        
    async def _enumerate_plugins(self, url: str) -> List[Dict]:
        """Enumerate installed plugins"""
        findings = []
        
        # Common plugin paths to check
        common_plugins = list(self.vulnerable_plugins.keys()) + [
            'akismet', 'jetpack', 'yoast-seo', 'wordfence',
            'contact-form-7', 'woocommerce', 'elementor-pro'
        ]
        
        for plugin in common_plugins:
            plugin_url = urljoin(url, f'wp-content/plugins/{plugin}/')
            try:
                async with self.session.get(plugin_url, timeout=3, ssl=False) as resp:
                    if resp.status == 200:
                        # Plugin exists
                        finding = {
                            'type': 'wordpress_plugin',
                            'plugin': plugin,
                            'url': plugin_url,
                            'status': 'exposed'
                        }
                        
                        # Check if known vulnerable
                        if plugin in self.vulnerable_plugins:
                            finding['vulnerable_version'] = self.vulnerable_plugins[plugin][0]
                            finding['cve'] = self.vulnerable_plugins[plugin][1]
                            finding['severity'] = 'high'
                            
                        findings.append(finding)
            except:
                continue
                
        return findings
        
    async def _enumerate_themes(self, url: str) -> List[Dict]:
        """Enumerate installed themes"""
        findings = []
        
        # Extract from HTML
        try:
            async with self.session.get(url, timeout=5, ssl=False) as resp:
                text = await resp.text()
                theme_matches = re.findall(r'/wp-content/themes/([^/]+)/', text)
                
                for theme in set(theme_matches):
                    findings.append({
                        'type': 'wordpress_theme',
                        'theme': theme,
                        'source': 'html_analysis'
                    })
        except:
            pass
            
        return findings
        
    async def _security_checks(self, url: str) -> List[Dict]:
        """Check security configurations"""
        findings = []
        
        checks = [
            ('xmlrpc.php', 'XML-RPC enabled'),
            ('wp-json/wp/v2/users', 'REST API user enumeration'),
            ('.htaccess', 'htaccess exposed'),
            ('wp-config.php~', 'Backup config file'),
            ('wp-admin/install.php', 'Installation files present')
        ]
        
        for path, description in checks:
            check_url = urljoin(url, path)
            try:
                async with self.session.get(check_url, timeout=3, ssl=False) as resp:
                    if resp.status == 200:
                        findings.append({
                            'type': 'security_misconfiguration',
                            'issue': description,
                            'url': check_url,
                            'severity': 'medium' if 'install' not in path else 'high'
                        })
            except:
                continue
                
        return findings
        
    async def _check_api_exposure(self, url: str) -> List[Dict]:
        """Check WordPress REST API exposure"""
        findings = []
        
        api_endpoints = [
            'wp-json/wp/v2/',
            'wp-json/wp/v2/users',
            'wp-json/wp/v2/posts',
            'wp-json/wp/v2/pages',
            'wp-json/wp/v2/media'
        ]
        
        for endpoint in api_endpoints:
            api_url = urljoin(url, endpoint)
            try:
                async with self.session.get(api_url, timeout=5, ssl=False) as resp:
                    if resp.status == 200:
                        try:
                            data = await resp.json()
                            finding = {
                                'type': 'api_exposure',
                                'endpoint': endpoint,
                                'url': api_url,
                                'accessible': True
                            }
                            
                            if 'users' in endpoint and isinstance(data, list):
                                finding['user_count'] = len(data)
                                finding['severity'] = 'high'
                                
                            findings.append(finding)
                        except:
                            pass
            except:
                continue
                
        return findings
        
    async def _enumerate_users(self, url: str) -> List[Dict]:
        """Enumerate WordPress users"""
        findings = []
        users = []
        
        # Method 1: REST API
        api_url = urljoin(url, 'wp-json/wp/v2/users?per_page=100')
        try:
            async with self.session.get(api_url, timeout=5, ssl=False) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    for user in data:
                        users.append({
                            'id': user.get('id'),
                            'name': user.get('name'),
                            'slug': user.get('slug')
                        })
        except:
            pass
            
        # Method 2: Author pages
        for i in range(1, 10):
            author_url = urljoin(url, f'?author={i}')
            try:
                async with self.session.get(author_url, timeout=3, ssl=False, allow_redirects=False) as resp:
                    if resp.status == 301:
                        location = resp.headers.get('Location', '')
                        if 'author' in location:
                            username = location.split('/')[-2] if location.endswith('/') else location.split('/')[-1]
                            if username and username not in [u['slug'] for u in users]:
                                users.append({
                                    'id': i,
                                    'slug': username,
                                    'source': 'author_page'
                                })
            except:
                continue
                
        if users:
            findings.append({
                'type': 'user_enumeration',
                'users_found': len(users),
                'users': users,
                'severity': 'medium'
            })
            
        return findings
        
    def _normalize_url(self, url: str) -> str:
        """Normalize URL format"""
        if not url.startswith(('http://', 'https://')):
            url = 'https://' + url
        return url.rstrip('/')
        
    def _check_version_vulnerable(self, version: str) -> List[str]:
        """Check if WordPress version has known vulnerabilities"""
        # Simplified check - in production, query WPScan API or CVE database
        vulnerable_versions = ['5.8', '5.8.1', '5.8.2', '6.4.0', '6.4.1']
        
        for vuln_ver in vulnerable_versions:
            if version.startswith(vuln_ver):
                return [f'WordPress {vuln_ver} has known vulnerabilities']
                
        return []
