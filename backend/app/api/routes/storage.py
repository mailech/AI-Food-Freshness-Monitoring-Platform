from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta

from app.db.session import get_db
from app.models.entities import StorageLocation, EnvironmentalReading, Alert, AuditLog, User
from app.schemas.all_schemas import StorageLocationCreate, StorageLocationUpdate, StorageLocationOut, EnvironmentalReadingCreate, EnvironmentalReadingOut, TelemetrySimulationInput
from app.api.dependencies import get_current_user, require_role

router = APIRouter(prefix="/storage", tags=["Storage & Environment Monitoring"])

@router.get("/locations", response_model=List[StorageLocationOut])
def list_storage_locations(db: Session = Depends(get_db)):
    locations = db.query(StorageLocation).all()
    results = []
    for loc in locations:
        is_compliant = (loc.ideal_temp_min <= loc.current_temperature <= loc.ideal_temp_max) and \
                       (loc.ideal_humidity_min <= loc.current_humidity <= loc.ideal_humidity_max)
        out = StorageLocationOut(
            id=loc.id,
            name=loc.name,
            location_type=loc.location_type,
            ideal_temp_min=loc.ideal_temp_min,
            ideal_temp_max=loc.ideal_temp_max,
            ideal_humidity_min=loc.ideal_humidity_min,
            ideal_humidity_max=loc.ideal_humidity_max,
            target_temp_min=loc.ideal_temp_min,
            target_temp_max=loc.ideal_temp_max,
            target_humidity_min=loc.ideal_humidity_min,
            target_humidity_max=loc.ideal_humidity_max,
            max_ethylene_ppm=1.5,
            max_co2_ppm=1000.0,
            current_temperature=loc.current_temperature,
            current_humidity=loc.current_humidity,
            air_circulation=loc.air_circulation,
            light_exposure=loc.light_exposure,
            last_reading_time=loc.last_reading_time or datetime.utcnow(),
            is_compliant=is_compliant,
            latest_reading={
                "temperature": loc.current_temperature,
                "humidity": loc.current_humidity,
                "is_compliant": is_compliant
            }
        )
        results.append(out)
    return results

@router.post("/locations", response_model=StorageLocationOut, status_code=status.HTTP_201_CREATED)
def create_storage_location(
    loc_in: StorageLocationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["warehouse_operator", "administrator"]))
):
    loc = StorageLocation(**loc_in.dict())
    db.add(loc)
    db.commit()
    db.refresh(loc)
    return loc

@router.post("/simulate-telemetry", response_model=EnvironmentalReadingOut)
def record_sensor_telemetry(
    sim_in: TelemetrySimulationInput,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    loc = db.query(StorageLocation).filter(StorageLocation.id == sim_in.storage_location_id).first()
    if not loc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Storage location not found")
        
    loc.current_temperature = sim_in.temperature
    loc.current_humidity = sim_in.humidity
    if sim_in.air_circulation:
        loc.air_circulation = sim_in.air_circulation
    if sim_in.light_exposure:
        loc.light_exposure = sim_in.light_exposure
    loc.last_reading_time = datetime.utcnow()
    
    # Check compliance
    is_temp_compliant = loc.ideal_temp_min <= sim_in.temperature <= loc.ideal_temp_max
    is_hum_compliant = loc.ideal_humidity_min <= sim_in.humidity <= loc.ideal_humidity_max
    is_compliant = is_temp_compliant and is_hum_compliant
    
    reading = EnvironmentalReading(
        storage_location_id=loc.id,
        temperature=sim_in.temperature,
        humidity=sim_in.humidity,
        air_circulation=sim_in.air_circulation or loc.air_circulation,
        light_exposure=sim_in.light_exposure or loc.light_exposure,
        is_compliant=is_compliant,
        recorded_by=f"IoT Telemetry Agent ({current_user.full_name})",
        timestamp=datetime.utcnow()
    )
    db.add(reading)
    
    # Trigger real alert if out of compliance
    alerts_triggered = []
    if not is_compliant:
        violation_details = []
        severity = "medium"
        if not is_temp_compliant:
            violation_details.append(f"Temperature {sim_in.temperature}°C outside bounds [{loc.ideal_temp_min}°C, {loc.ideal_temp_max}°C]")
            if sim_in.temperature > loc.ideal_temp_max + 4.0:
                severity = "critical"
        if not is_hum_compliant:
            violation_details.append(f"Humidity {sim_in.humidity}% outside bounds [{loc.ideal_humidity_min}%, {loc.ideal_humidity_max}%]")
            
        alert_msg = f"Environmental deviation detected in {loc.name}: " + "; ".join(violation_details)
        alert = Alert(
            alert_type="storage_condition",
            severity=severity,
            title=f"Storage Breach: {loc.name}",
            message=alert_msg,
            storage_location_id=loc.id,
            is_read=False,
            is_resolved=False
        )
        db.add(alert)
        alerts_triggered.append(alert_msg)
        
    db.commit()
    db.refresh(reading)
    
    out = EnvironmentalReadingOut(
        id=reading.id,
        storage_location_id=reading.storage_location_id,
        temperature=reading.temperature,
        humidity=reading.humidity,
        ethylene=sim_in.ethylene or 0.5,
        co2_level=sim_in.co2_level or 400.0,
        air_circulation=reading.air_circulation,
        light_exposure=reading.light_exposure,
        is_compliant=reading.is_compliant,
        compliance_status="compliant" if is_compliant else "violation",
        alerts_triggered=alerts_triggered,
        recorded_by=reading.recorded_by,
        timestamp=reading.timestamp
    )
    return out

@router.get("/readings/{location_id}", response_model=List[EnvironmentalReadingOut])
def get_location_readings(
    location_id: int,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    readings = db.query(EnvironmentalReading).filter(
        EnvironmentalReading.storage_location_id == location_id
    ).order_by(EnvironmentalReading.timestamp.desc()).limit(limit).all()
    return readings
