#!/usr/bin/env python3
"""
FastAPI REST API Server
Provides HTTP interface for OSINT operations
"""

from fastapi import FastAPI, HTTPException, BackgroundTasks, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
import os

from osint_platform.core.engine import OSINTEngine
from osint_platform.core.config_manager import ConfigManager


# Initialize FastAPI app
app = FastAPI(
    title="OSINT Automation Platform API",
    description="RESTful API for comprehensive OSINT operations",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
security = HTTPBearer()

# Global engine instance
engine: Optional[OSINTEngine] = None


# Pydantic models
class ScanRequest(BaseModel):
    target: str = Field(..., description="Target domain, IP, or URL")
    modules: Optional[List[str]] = Field(None, description="OSINT modules to run")
    options: Optional[Dict[str, Any]] = Field(None, description="Additional scan options")
    
class ScanResponse(BaseModel):
    scan_id: str
    status: str
    target: str
    modules: List[str]
    started_at: datetime
    
class ScanResult(BaseModel):
    module: str
    target: str
    timestamp: datetime
    status: str
    findings: List[Dict[str, Any]]
    execution_time: float
    
class HealthResponse(BaseModel):
    status: str
    version: str
    modules_available: List[str]


# Startup event
@app.on_event("startup")
async def startup_event():
    global engine
    config_path = os.getenv('CONFIG_PATH', 'config/config.yaml')
    engine = OSINTEngine(config_path)
    print(f"OSINT Engine initialized with modules: {list(engine.modules.keys())}")


# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    if engine:
        engine.close()


# Dependency to verify auth (simplified - implement properly in production)
async def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    # Implement JWT validation here
    return credentials.credentials


# API Endpoints
@app.get("/", tags=["General"])
async def root():
    return {"message": "OSINT Automation Platform API", "version": "1.0.0"}


@app.get("/health", response_model=HealthResponse, tags=["General"])
async def health_check():
    """Health check endpoint"""
    return HealthResponse(
        status="healthy",
        version="1.0.0",
        modules_available=list(engine.modules.keys()) if engine else []
    )


@app.post("/scan", response_model=ScanResponse, tags=["Scanning"])
async def create_scan(
    request: ScanRequest,
    background_tasks: BackgroundTasks,
    token: str = Depends(verify_token)
):
    """
    Initiate new OSINT scan
    
    - **target**: Domain, IP address, or URL to scan
    - **modules**: Specific modules to run (null = use defaults)
    - **options**: Module-specific options
    """
    if not engine:
        raise HTTPException(status_code=503, detail="Engine not initialized")
        
    scan_id = f"scan_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}_{request.target.replace('.', '_')}"
    
    # Start scan in background
    background_tasks.add_task(
        execute_scan_task,
        scan_id=scan_id,
        target=request.target,
        modules=request.modules,
        options=request.options
    )
    
    return ScanResponse(
        scan_id=scan_id,
        status="started",
        target=request.target,
        modules=request.modules or engine.config.get('scanning.default_modules'),
        started_at=datetime.utcnow()
    )


@app.get("/scan/{scan_id}/status", tags=["Scanning"])
async def get_scan_status(scan_id: str, token: str = Depends(verify_token)):
    """Get status of running or completed scan"""
    # Implementation would query database for scan status
    return {"scan_id": scan_id, "status": "in_progress"}


@app.get("/scan/{scan_id}/results", response_model=List[ScanResult], tags=["Scanning"])
async def get_scan_results(scan_id: str, token: str = Depends(verify_token)):
    """Get results of completed scan"""
    # Implementation would retrieve from database
    return []


@app.get("/modules", tags=["Modules"])
async def list_modules(token: str = Depends(verify_token)):
    """List available OSINT modules and their status"""
    if not engine:
        raise HTTPException(status_code=503, detail="Engine not initialized")
        
    return engine.get_module_info()


@app.post("/wordpress/scan", tags=["WordPress"])
async def wordpress_scan(
    target: str = Query(..., description="WordPress site URL"),
    aggressive: bool = Query(False, description="Enable aggressive scanning"),
    enumerate_users: bool = Query(False, description="Enumerate WordPress users"),
    token: str = Depends(verify_token)
):
    """
    Specialized WordPress security scan
    
    Performs comprehensive WordPress attack surface assessment including:
    - Version detection
    - Plugin enumeration
    - Theme detection
    - Security configuration checks
    - API exposure assessment
    """
    if not engine or 'wordpress' not in engine.modules:
        raise HTTPException(status_code=503, detail="WordPress module not available")
        
    options = {
        'aggressive': aggressive,
        'enumerate_users': enumerate_users
    }
    
    results = await engine.execute_scan(
        target=target,
        modules=['wordpress'],
        options=options
    )
    
    return results


@app.get("/targets", tags=["Monitoring"])
async def list_monitored_targets(token: str = Depends(verify_token)):
    """List targets under continuous monitoring"""
    # Implementation would query monitoring configuration
    return []


@app.post("/targets", tags=["Monitoring"])
async def add_monitoring_target(
    target: str,
    interval: str = "24h",
    modules: Optional[List[str]] = None,
    token: str = Depends(verify_token)
):
    """Add target for continuous monitoring"""
    # Implementation would add to monitoring queue
    return {"status": "added", "target": target}


# Background task executor
async def execute_scan_task(scan_id: str, target: str, modules: Optional[List[str]], options: Optional[Dict]):
    """Background task to execute scan"""
    try:
        results = await engine.execute_scan(target, modules, options)
        # Store results in database
        print(f"Scan {scan_id} completed with {len(results)} results")
    except Exception as e:
        print(f"Scan {scan_id} failed: {e}")


# Run server
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
