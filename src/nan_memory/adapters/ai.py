from __future__ import annotations

import re

from nan_memory.domain.models import AIAnswer, Citation, GraphEntity


class LocalGroundedAIProvider:
    """Deterministic safe default. Replace with a provider adapter in production."""

    model = "local-grounded-v1"

    async def answer(self, question: str, context: list[GraphEntity], language: str) -> AIAnswer:
        if not context:
            message = (
                "ไม่พบข้อมูลที่ได้รับอนุมัติเพียงพอสำหรับคำถามนี้"
                if language.startswith("th")
                else "I could not find enough approved information to answer this question."
            )
            return AIAnswer(message, [], False, self.model)
        names = [
            item.name_th if language.startswith("th") else item.name_en or item.name_th
            for item in context[:3]
        ]
        prefix = "ข้อมูลที่เกี่ยวข้อง: " if language.startswith("th") else "Relevant places: "
        answer = prefix + ", ".join(names) + "."
        citations = [Citation(item.id, item.name_en or item.name_th) for item in context[:3]]
        return AIAnswer(answer, citations, True, self.model)

    async def propose_enrichment(self, text: str, language: str) -> dict:
        candidates = sorted(set(re.findall(r"\b[A-Z][\w-]{2,}(?:\s+[A-Z][\w-]{2,})*", text)))[:20]
        return {
            "language": language,
            "summary": text.strip()[:280],
            "entityCandidates": [
                {"surface": value, "type": "Unknown", "confidence": 0.5} for value in candidates
            ],
            "claimCandidates": [],
            "model": self.model,
        }
