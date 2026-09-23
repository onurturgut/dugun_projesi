"""Scenario budget, not an invoice forecast. Run with Python 3.12+ (stdlib only).
Sources checked 2026-09-17. No production data or credentials are accessed.
"""
from pathlib import Path
import csv
import json
import math

ROOT = Path(__file__).resolve().parent
FX = 50  # Planning assumption, NOT current USD/TRY exchange rate.
VAT = 0.20  # Sales-price modelling assumption; confirm service classification.
RESERVE = 0.15  # Unspent contingency is NOT an accounting expense.
SUPPORT_HOURLY = 300
MONTHS = 3  # Whole album present for 3 months; actual daily storage differs.
RATES = dict(storage=0.015, r2_write_million=4.50, r2_read_million=0.36,
             transfer=0.15, origin=0.06, cpu_hour=0.184, memory_gbh=0.0152,
             edge_million=2.60, invocation_million=0.60)
SOURCES = {
    'R2 Standard': 'https://developers.cloudflare.com/r2/pricing/',
    'Vercel Frankfurt benchmark': 'https://vercel.com/docs/pricing/regional-pricing/fra1',
    'Vercel functions': 'https://vercel.com/pricing',
    'Vercel Pro': 'https://vercel.com/docs/plans/pro-plan',
    'Flat Rate eligibility': 'https://vercel.com/docs/pricing/flat-rate-cdn',
    'MongoDB Flex': 'https://www.mongodb.com/docs/atlas/billing/atlas-flex-costs/',
}
SCENARIOS = [
    dict(name='Mini', photos=400, videos=20, support_minutes=15, requests=5000,
         cpu_hours=0.1, memory_gbh=1, price=1800, resale=2700),
    dict(name='Standart', photos=800, videos=40, support_minutes=20, requests=10000,
         cpu_hours=0.2, memory_gbh=2, price=2500, resale=3750),
    dict(name='Yogun', photos=2400, videos=120, support_minutes=45, requests=30000,
         cpu_hours=0.6, memory_gbh=6, price=4500, resale=6750),
]

def calculate(s, traffic_multiple=3, fx=FX):
    files = s['photos'] + s['videos']
    gb = (s['photos'] * 5 + s['videos'] * 150) / 1000
    traffic = gb * traffic_multiple  # All viewing, downloads and ZIP combined.
    writes = math.ceil(files * 1.05)  # Assumed 5% write retries.
    reads = files * 6  # HEAD/GET/range requests: illustrative, not telemetry.
    storage = gb * MONTHS * RATES['storage'] * fx
    operations = (writes / 1e6 * RATES['r2_write_million'] +
                  reads / 1e6 * RATES['r2_read_million']) * fx
    transfer = traffic * (RATES['transfer'] + RATES['origin']) * fx
    compute = (s['cpu_hours'] * RATES['cpu_hour'] +
               s['memory_gbh'] * RATES['memory_gbh'] +
               s['requests'] / 1e6 * (RATES['edge_million'] + RATES['invocation_million'])) * fx
    support = s['support_minutes'] / 60 * SUPPORT_HOURLY
    subtotal = storage + operations + transfer + compute + support
    budget = math.ceil(subtotal * (1 + RESERVE) / 10) * 10
    return dict(**s, files=files, gb=gb, traffic_gb=traffic, writes=writes, reads=reads,
                storage_tl=storage, r2_operations_tl=operations, transfer_tl=transfer,
                compute_tl=compute, support_tl=support, subtotal_tl=subtotal,
                contingency_tl=subtotal*RESERVE, variable_budget_tl=budget)

def annual_fixed(company_monthly=15000, fx=FX):
    # MongoDB is a shared cluster budget, not charged again per query/event.
    return (20 + 30 + 5) * 12 * fx + 1000 + 10000 + company_monthly * 12

rows = [calculate(s) for s in SCENARIOS]
F = annual_fixed()
for row in rows:
    net = row['price'] / (1 + VAT)
    contribution = net - row['variable_budget_tl']
    full = row['variable_budget_tl'] + F / 250
    row.update(net_revenue_tl=net, contribution_tl=contribution,
               contribution_margin=contribution/net,
               full_budget_at_250_tl=full, revenue_cost_ratio=net/full,
               surplus_at_250_per_event_tl=net-full,
               breakeven_events=math.ceil(F/contribution),
               partner_spread_before_costs_tl=(row['resale']-row['price'])/(1+VAT))
    assert row['traffic_gb'] == row['gb']*3
    assert row['variable_budget_tl'] >= row['subtotal_tl']*1.15
    assert contribution * row['breakeven_events'] >= F
    assert contribution * (row['breakeven_events']-1) < F

price_comparison = []
for price in (1500, 2000, 2500, 3000):
    net = price / 1.2
    contribution = net - rows[1]['variable_budget_tl']
    price_comparison.append(dict(price=price, net=net, contribution=contribution,
                                breakeven=math.ceil(F/contribution)))
sensitivity = [dict(company_monthly=c, fixed=annual_fixed(c),
                    breakeven_2000=math.ceil(annual_fixed(c)/(2000/1.2-510)),
                    breakeven_2500=math.ceil(annual_fixed(c)/(2500/1.2-510)))
               for c in (10000,15000,20000)]
volume = [dict(events=n, revenue=n*2500/1.2, variable=n*510, fixed=F,
               budget_surplus=n*(2500/1.2-510)-F,
               revenue_cost_ratio=(n*2500/1.2)/(n*510+F)) for n in (100,175,250)]
traffic_sensitivity = [dict(multiplier=m, variable=calculate(SCENARIOS[1], m)['variable_budget_tl'])
                       for m in (1,3,6)]
fx_sensitivity = [dict(fx=f, variable=calculate(SCENARIOS[1], fx=f)['variable_budget_tl'],
                      fixed=annual_fixed(fx=f)) for f in (40,50,60)]
payload = dict(date='2026-09-17', planning_fx=FX, sales_vat_assumption=VAT,
               fixed_budget_tl=F, sources=SOURCES, scenarios=rows,
               price_comparison=price_comparison, overhead_sensitivity=sensitivity,
               volume=volume, traffic_sensitivity=traffic_sensitivity,
               fx_sensitivity=fx_sensitivity)
(ROOT/'results.json').write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding='utf-8')
with (ROOT/'unit-costs.csv').open('w', newline='', encoding='utf-8-sig') as f:
    writer = csv.DictWriter(f, fieldnames=list(rows[0]), delimiter=';')
    writer.writeheader()
    writer.writerows(rows)
print(json.dumps(payload, ensure_ascii=False, indent=2))
