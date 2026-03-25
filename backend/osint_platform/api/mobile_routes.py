#!/usr/bin/env python3
"""
Mobile-specific API routes
Optimized for mobile app consumption
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import JSONResponse
from typing import List, Optional
from datetime import datetime, timedelta

from osint_platform.core.engine import OSINTEngine
from osint_platform.database.repository import OSINTRepository
from osint_platform.api.auth import get_current_user

router = APIRouter(prefix="/mobile", tags=["Mobile"])


@router.get("/dashboard/stats")
async def get_mobile_dashboard_stats(
    current_user = Depends(get_current_user),
    engine: OSINTEngine = Depends(get_engine)
):
    """
    Get optimized dashboard stats for mobile app
    Lightweight response with essential data only
    """
    # Get last 7 days of data
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=7)
    
    # Aggregate stats
    stats = {
        "securityScore": await calculate_security_score(current_user.id),
        "scoreChange": 5,  # vs last week
        "criticalFindings": await count_findings(current_user.id, "critical", start_date),
        "criticalChange": -2,  # vs last week
        "activeScans": await count_active_scans(current_user.id),
        "totalTargets": await count_targets(current_user.id),
        "targetChange": 3,
        "trend": await get_weekly_trend(current_user.id, start_date, end_date),
        "severity": await get_severity_distribution(current_user.id),
        "recentAlerts": await get_recent_alerts(current_user.id, limit=5),
    }
    
    return stats


@router.get("/scans/active")
async def get_active_scans(
    current_user = Depends(get_current_user),
    limit: int = Query(10, le=50)
):
    """Get currently running scans with progress"""
    scans = await OSINTRepository.get_active_scans(
        user_id=current_user.id,
        limit=limit
    )
    
    return [
        {
            "id": scan.id,
            "target": scan.target,
            "modules": scan.modules,
            "progress": scan.progress,
            "status": scan.status,
            "started_at": scan.started_at,
            "eta": calculate_eta(scan)
        }
        for scan in scans
    ]


@router.post("/notifications/push-token")
async def register_push_token(
    token: str,
    device_type: str,  # ios, android
    current_user = Depends(get_current_user)
):
    """Register FCM/APNs token for push notifications"""
    await OSINTRepository.save_push_token(
        user_id=current_user.id,
        token=token,
        device_type=device_type
    )
    return {"status": "registered"}


@router.get("/targets/{target_id}/status")
async def get_target_mobile_status(
    target_id: str,
    current_user = Depends(get_current_user)
):
    """
    Get condensed target status for mobile
    Includes last scan summary and health status
    """
    target = await OSINTRepository.get_target(target_id, current_user.id)
    
    if not target:
        raise HTTPException(status_code=404, detail="Target not found")
    
    last_scan = await OSINTRepository.get_last_scan(target_id)
    
    return {
        "id": target.id,
        "domain": target.domain,
        "health_status": calculate_health_status(target, last_scan),
        "last_scan": {
            "id": last_scan.id if last_scan else None,
            "date": last_scan.completed_at if last_scan else None,
            "findings_count": len(last_scan.findings) if last_scan else 0,
            "critical_count": count_critical(last_scan.findings) if last_scan else 0,
        },
        "uptime_percentage": target.uptime_percentage,
        "response_time_ms": target.avg_response_time,
        "ssl_expiry_days": days_until_ssl_expiry(target),
    }


# Helper functions
async def calculate_security_score(user_id: str) -> int:
    # Complex scoring algorithm based on findings, coverage, etc.
    pass

def calculate_eta(scan) -> Optional[str]:
    """Calculate estimated time of completion"""
    if scan.progress == 0:
        return None
    
    elapsed = (datetime.utcnow() - scan.started_at).total_seconds()
    total_estimated = elapsed / (scan.progress / 100)
    remaining = total_estimated - elapsed
    
    if remaining < 60:
        return f"{int(remaining)}s"
    elif remaining < 3600:
        return f"{int(remaining/60)}m"
    else:
        return f"{int(remaining/3600)}h {int((remaining%3600)/60)}m"
