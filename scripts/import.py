"""
Importscript för historiska beställningar från Excel till Serwent-plattformen.
Kör: python3 scripts/import.py
"""
import openpyxl
import json
import urllib.request

API_URL = "https://colead-serwent.vercel.app/api/orders/import"
XLSX_PATH = "/Users/oliveratterflod/Downloads/Serwent_Bestillinger - Import.xlsx"

# Hämta service role key — behövs för autentisering
SECRET = input("Klistra in SUPABASE_SERVICE_ROLE_KEY: ").strip()

wb = openpyxl.load_workbook(XLSX_PATH)
ws = wb.active
rows = list(ws.iter_rows(values_only=True))
data_rows = rows[1:]  # Hoppa över header

orders = []
for i, row in enumerate(data_rows):
    dato = row[1]
    order = {
        "order_id": f"BES-IMP-{i+1:04d}",
        "kommune": row[3] or "",
        "tomming_type": row[4] or "",
        "navn": row[5] or "",
        "epost": row[6] or "",
        "telefon": str(row[7]) if row[7] else "",
        "adresse": row[8] or "",
        "gnr": str(row[9]) if row[9] is not None else "",
        "bnr": str(row[10]) if row[10] is not None else "",
        "kommentar": row[11] if row[11] else None,
        "status": "utfort",
    }
    if dato:
        order["created_at"] = dato.isoformat()
    orders.append(order)

print(f"\n{len(orders)} beställningar redo att importeras.")
print(f"Exempel: {orders[0]}")
confirm = input("\nFortsätt? (ja/nej): ").strip()
if confirm != "ja":
    print("Avbryter.")
    exit()

# Skicka i batchar om 50
BATCH = 50
total_inserted = 0
total_errors = []

for start in range(0, len(orders), BATCH):
    batch = orders[start:start + BATCH]
    payload = json.dumps({"orders": batch}).encode()

    req = urllib.request.Request(
        API_URL,
        data=payload,
        headers={
            "Content-Type": "application/json",
            "x-import-secret": SECRET,
        },
    )

    try:
        with urllib.request.urlopen(req) as res:
            result = json.loads(res.read())
            total_inserted += result["inserted"]
            total_errors.extend(result.get("errors", []))
            print(f"  Batch {start//BATCH + 1}: {result['inserted']}/{len(batch)} OK")
    except Exception as e:
        print(f"  Batch {start//BATCH + 1}: FEL — {e}")

print(f"\nKlart! {total_inserted}/{len(orders)} importerade.")
if total_errors:
    print(f"\n{len(total_errors)} fel:")
    for err in total_errors[:10]:
        print(f"  - {err}")
