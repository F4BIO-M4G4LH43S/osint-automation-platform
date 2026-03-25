#!/usr/bin/env python3
"""
Click CLI Interface
Command-line interface for OSINT operations
"""

import click
import asyncio
import json
import sys
from pathlib import Path
from typing import Optional
from rich.console import Console
from rich.table import Table
from rich.progress import Progress, SpinnerColumn, TextColumn

from osint_platform.core.engine import OSINTEngine
from osint_platform.core.config_manager import ConfigManager


console = Console()


@click.group()
@click.option('--config', '-c', default='config/config.yaml', help='Configuration file path')
@click.option('--verbose', '-v', is_flag=True, help='Verbose output')
@click.pass_context
def cli(ctx, config, verbose):
    """OSINT Automation Platform - Command Line Interface"""
    ctx.ensure_object(dict)
    ctx.obj['config_path'] = config
    ctx.obj['verbose'] = verbose
    
    # Initialize engine
    try:
        ctx.obj['engine'] = OSINTEngine(config)
        if verbose:
            console.print(f"[green]Engine initialized with config: {config}[/green]")
    except Exception as e:
        console.print(f"[red]Failed to initialize engine: {e}[/red]")
        sys.exit(1)


@cli.command()
@click.argument('target')
@click.option('--modules', '-m', multiple=True, help='Modules to run (default: all enabled)')
@click.option('--output', '-o', type=click.Choice(['json', 'csv', 'markdown', 'table']), default='table')
@click.option('--save', '-s', help='Save results to file')
@click.pass_context
def scan(ctx, target, modules, output, save):
    """Run OSINT scan against target"""
    engine = ctx.obj['engine']
    module_list = list(modules) if modules else None
    
    console.print(f"[blue]Starting scan of {target}...[/blue]")
    
    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        console=console
    ) as progress:
        task = progress.add_task("Scanning...", total=None)
        
        # Run scan
        results = asyncio.run(engine.execute_scan(target, module_list))
        
        progress.update(task, completed=True)
    
    # Display results
    if output == 'table':
        _display_table_results(results)
    elif output == 'json':
        _display_json_results(results)
    elif output == 'markdown':
        _display_markdown_results(results, target)
        
    # Save if requested
    if save:
        _save_results(results, save, output)
        console.print(f"[green]Results saved to {save}[/green]")


@cli.command()
@click.option('--target', '-t', multiple=True, help='Target to monitor')
@click.option('--interval', default='24h', help='Monitoring interval')
@click.option('--config-file', help='Monitoring configuration file')
@click.pass_context
def monitor(ctx, target, interval, config_file):
    """Continuous monitoring mode"""
    console.print(f"[yellow]Starting continuous monitoring...[/yellow]")
    console.print(f"Interval: {interval}")
    console.print(f"Targets: {', '.join(target)}")
    
    # Implementation would set up scheduled scans
    # For now, just run once
    for t in target:
        ctx.invoke(scan, target=t, modules=None, output='table', save=None)


@cli.command()
@click.pass_context
def modules(ctx):
    """List available modules"""
    engine = ctx.obj['engine']
    info = engine.get_module_info()
    
    table = Table(title="Available OSINT Modules")
    table.add_column("Module", style="cyan")
    table.add_column("Status", style="green")
    table.add_column("Description", style="white")
    table.add_column("Version", style="blue")
    
    for name, data in info.items():
        status = "✅ Enabled" if data['enabled'] else "❌ Disabled"
        table.add_row(
            name,
            status,
            data.get('description', 'N/A')[:50],
            data.get('version', 'N/A')
        )
        
    console.print(table)


@cli.command()
@click.argument('target')
@click.option('--aggressive', is_flag=True, help='Aggressive scanning')
@click.option('--users', is_flag=True, help='Enumerate users')
@click.pass_context
def wordpress(ctx, target, aggressive, users):
    """WordPress-specific security scan"""
    engine = ctx.obj['engine']
    
    if 'wordpress' not in engine.modules:
        console.print("[red]WordPress module not available[/red]")
        return
        
    console.print(f"[blue]Running WordPress scan against {target}...[/blue]")
    
    options = {
        'aggressive': aggressive,
        'enumerate_users': users
    }
    
    results = asyncio.run(engine.execute_scan(target, ['wordpress'], options))
    
    for result in results:
        console.print(f"\n[bold]{result.module.upper()}[/bold]")
        for finding in result.findings:
            if finding.get('type') == 'wordpress_detected':
                console.print(f"[green]WordPress detected (confidence: {finding['confidence']}%)")
                if finding.get('version'):
                    console.print(f"Version: {finding['version']}")
                    
            elif finding.get('type') == 'wordpress_plugin':
                color = "red" if finding.get('cve') else "yellow"
                console.print(f"[{color}]Plugin: {finding['plugin']}[/{color}]")
                if finding.get('cve'):
                    console.print(f"  ⚠️  CVE: {finding['cve']}")
                    
            elif finding.get('type') == 'security_misconfiguration':
                console.print(f"[red]Security Issue: {finding['issue']}[/red]")
                console.print(f"  URL: {finding['url']}")


@cli.command()
@click.option('--host', default='0.0.0.0', help='Host to bind')
@click.option('--port', default=8000, help='Port to bind')
@click.pass_context
def serve(ctx, host, port):
    """Start API server"""
    from osint_platform.api.server import app
    import uvicorn
    
    console.print(f"[green]Starting API server on {host}:{port}[/green]")
    console.print(f"Documentation: http://{host}:{port}/docs")
    
    uvicorn.run(app, host=host, port=port)


def _display_table_results(results):
    """Display results in rich table format"""
    for result in results:
        table = Table(title=f"{result.module.upper()} - {result.target}")
        table.add_column("Type", style="cyan")
        table.add_column("Finding", style="white")
        table.add_column("Severity", style="red")
        
        for finding in result.findings:
            if isinstance(finding, dict):
                finding_type = finding.get('type', 'unknown')
                description = str(finding)[:100]
                severity = finding.get('severity', 'info')
                table.add_row(finding_type, description, severity)
                
        console.print(table)
        console.print(f"Execution time: {result.execution_time:.2f}s")
        console.print()


def _display_json_results(results):
    """Display results as JSON"""
    output = []
    for result in results:
        output.append({
            'module': result.module,
            'target': result.target,
            'timestamp': result.timestamp.isoformat(),
            'status': result.status,
            'findings': result.findings,
            'execution_time': result.execution_time
        })
    console.print(json.dumps(output, indent=2, default=str))


def _display_markdown_results(results, target):
    """Display results as Markdown"""
    md = f"# OSINT Scan Report: {target}\n\n"
    md += f"**Date:** {results[0].timestamp.isoformat() if results else 'N/A'}\n\n"
    
    for result in results:
        md += f"## {result.module.upper()}\n\n"
        for finding in result.findings:
            md += f"### {finding.get('type', 'Finding')}\n"
            md += f"```json\n{json.dumps(finding, indent=2)}\n```\n\n"
            
    console.print(md)


def _save_results(results, filepath, format):
    """Save results to file"""
    path = Path(filepath)
    
    if format == 'json':
        output = []
        for result in results:
            output.append({
                'module': result.module,
                'target': result.target,
                'timestamp': result.timestamp.isoformat(),
                'status': result.status,
                'findings': result.findings,
                'execution_time': result.execution_time
            })
        path.write_text(json.dumps(output, indent=2, default=str))
        
    elif format == 'markdown':
        # Generate markdown report
        pass  # Implementation


if __name__ == '__main__':
    cli()
