FACT_EXTRACTION_PROMPT = """You are extracting verifiable facts from a document for a fact knowledge layer.

Read the attached PDF and extract meaningful numerical or semantic facts. A fact is a
specific claim someone could check, such as a financial figure, a growth rate, a count,
a date, a person's role, or a named relationship between entities.

For each fact return a JSON object with these fields:
- subject: what or who the fact is about
- predicate: the kind of fact, e.g. "revenue", "employee count", "held position"
- value: the number or short value
- unit: unit of the value if any, else null
- time_period: the period or date the fact applies to, else null
- scope: what the fact covers, e.g. "consolidated", "standalone", "India operations", else null
- quote: the exact verbatim sentence or phrase from the document that states this fact
- page: the page number in the PDF where the quote appears

Return only a JSON array of these objects, no other text. Extract at most 30 of the most
important facts, favoring ones likely to be checkable against other documents.
"""
