from fastapi import APIRouter, Query
from app.services.jobs import search_jobs

router = APIRouter()


@router.get("/jobs")
async def jobs(name: str = Query(...)):
    return await search_jobs(company=name)
