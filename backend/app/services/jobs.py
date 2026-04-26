import os
import httpx
from dotenv import load_dotenv

load_dotenv()

_cache: dict[str, dict] = {}


async def search_jobs(company: str) -> dict:
    if company in _cache:
        return _cache[company]

    api_key = os.getenv("JOOBLE_KEY")
    if not api_key:
        return {"total": 0, "jobs": []}

    async with httpx.AsyncClient(timeout=10.0) as client:
        r = await client.post(
            f"https://jooble.org/api/{api_key}",
            json={"keywords": company, "location": "Chile"},
        )
        data = r.json()

    total = data.get("totalCount", 0)
    jobs = [
        {
            "title": j.get("title", ""),
            "company": j.get("company", ""),
            "location": j.get("location", ""),
            "link": j.get("link", ""),
        }
        for j in data.get("jobs", [])[:5]
    ]

    result = {"total": total, "jobs": jobs}
    _cache[company] = result
    return result
