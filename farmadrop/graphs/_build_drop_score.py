#!/usr/bin/env python3
"""Builder for the Drop Score factor-model knowledge graph.
Writes drop_score_graph.json and drop_score.html (JSON inlined, identical)."""
import json, os

HERE = os.path.dirname(os.path.abspath(__file__))

# ---- source registry (short names -> url) ----
SOURCES = [
    {"name": "USDA NRCS — 4 Soil Health Principles",
     "url": "https://www.nrcs.usda.gov/conservation-basics/soil/soil-health"},
    {"name": "Soil Health Institute — Minimum Suite of Soil Health Indicators",
     "url": "https://soilhealthinstitute.org/our-work/initiatives/measurements/"},
    {"name": "Regenerative Organic Certified — Framework (3 pillars)",
     "url": "https://regenorganic.org/wp-content/uploads/2020/11/ROC_Framework.pdf"},
    {"name": "Savory Institute — Ecological Outcome Verification (EOV)",
     "url": "https://savory.global/eov/"},
    {"name": "Regenified — 6-3-4 Verification Standard",
     "url": "https://regenified.com/understanding-our-value/"},
    {"name": "FAO / Alliance Bioversity-CIAT — Agrobiodiversity Index",
     "url": "https://www.fao.org/plant-treaty/tools/toolbox-for-sustainable-use/details/en/c/1312762/"},
    {"name": "Noble Research Institute — 6 Soil Health Principles",
     "url": "https://www.noble.org/regenerative-agriculture/6-soil-health-principles-for-regenerative-cattle-ranches/"},
]

# ---- nodes ----
# helper to keep the definitions compact
def N(id, tier, parent, label, pm, why, prox, data, gam, refs):
    return {"id": id, "tier": tier, "parent": parent, "label": label,
            "plain_meaning": pm, "why_it_matters": why, "evaluable_proxy": prox,
            "data_source": data, "gaming_resistance": gam, "refs": refs}

nodes = []

# ---------- ROOT ----------
nodes.append(N("drop_score", 0, None, "Drop Score",
    "A guidance tree that spells out what regenerative food production really means, in terms a small farmer can see and evidence — not one black-box number.",
    "It turns a fuzzy marketing word ('regenerative') into concrete, checkable practices, so buyers can trust it and farmers know exactly what to improve next.",
    "Coverage and evidence across the leaf indicators below — how much of the tree a producer can actually demonstrate.",
    "A composite of soil tests, satellite imagery, photo evidence, receipts, self-report + spot-audit, and third-party certifications across every branch.",
    "No hidden weights to reverse-engineer: the tree only exposes transparent evidence on named indicators, and cross-checks self-reports against physical soil and satellite data that are hard to fake.",
    ["USDA NRCS — 4 Soil Health Principles", "Regenerative Organic Certified — Framework (3 pillars)", "Savory Institute — Ecological Outcome Verification (EOV)"]))

# ---------- TIER 1 DOMAINS ----------
nodes.append(N("d_soil", 1, "drop_score", "Regenerative — Soil",
    "The living-soil foundation: are you building soil organic matter, keeping the ground covered and rooted, and disturbing it as little as possible?",
    "Soil health is the root system of everything regenerative — carbon, water, nutrients and resilience all flow from it (the four NRCS principles).",
    "Evidence across the five soil factors below: cover, disturbance, living roots, carbon, and water/structure.",
    "Accredited soil tests, in-field infiltration tests, dated photos, and satellite NDVI.",
    "Physical soil measurements (organic matter, aggregate stability, infiltration) change slowly and are lab-verifiable — you cannot fake a multi-year soil-test trend.",
    ["USDA NRCS — 4 Soil Health Principles", "Soil Health Institute — Minimum Suite of Soil Health Indicators", "Regenified — 6-3-4 Verification Standard"]))

nodes.append(N("d_diversity", 1, "drop_score", "Diversity",
    "How many genuinely different crops, animals, varieties, habitats and income streams your farm runs — the opposite of a single-commodity monoculture.",
    "Diversity is the founder's core factor family; it drives soil health, pest resilience, income stability and biodiversity all at once.",
    "Counts and evenness across crops/rotation, genetics, enterprises, non-crop habitat, and market channels.",
    "Planting and sales records, seed/breed receipts, and aerial/satellite imagery.",
    "Diversity claims are cross-checked against sales ledgers and imagery — you cannot sell or show what you did not actually grow.",
    ["FAO / Alliance Bioversity-CIAT — Agrobiodiversity Index", "USDA NRCS — 4 Soil Health Principles"]))

nodes.append(N("d_practices", 1, "drop_score", "Operating Practices",
    "The day-to-day management choices: how you handle inputs, nutrients, animals, water, waste and energy.",
    "Practices are where regeneration is actually done; ROC and Regenified verify practices alongside measured outcomes.",
    "Evidence across input reduction, nutrient management, grazing integration, water stewardship, and waste/energy.",
    "Purchase receipts, application and spray records, meter readings, and certifications.",
    "Input and resource use leave a paper trail (purchases, meters, logs) that is hard to understate without falsifying records.",
    ["Regenerative Organic Certified — Framework (3 pillars)", "Regenified — 6-3-4 Verification Standard"]))

nodes.append(N("d_animal", 1, "drop_score", "Animal & Livestock Welfare",
    "Whether animals on the farm live well — out on pasture, handled gently, healthy, and free from routine mutilations.",
    "ROC makes animal welfare a required pillar; for livestock farms it is inseparable from regenerative land use.",
    "Pasture access, space, low-stress handling and herd/flock health.",
    "Site audit, dated photos, veterinary records, and third-party certification.",
    "Welfare shows in the animals and facilities on an unannounced site visit and in vet records — it is hard to stage herd-wide.",
    ["Regenerative Organic Certified — Framework (3 pillars)", "Savory Institute — Ecological Outcome Verification (EOV)"]))

nodes.append(N("d_community", 1, "drop_score", "Community & Local Economy",
    "How the farm treats its people and its place — fair pay and safe work, and food that actually reaches the local community.",
    "ROC's third pillar is social fairness; Farmer Drop's whole thesis is returning value to farmers and local eaters.",
    "Fair-labor evidence and local sourcing/access across the enterprise.",
    "Payroll records, confidential worker interviews, sales-geography data, third-party certification.",
    "Wage and sourcing claims are checkable against payroll and delivery records and via worker interviews — far harder to fake than a self-declaration.",
    ["Regenerative Organic Certified — Framework (3 pillars)", "FAO / Alliance Bioversity-CIAT — Agrobiodiversity Index"]))

# ---------- SOIL: factors + indicators ----------
nodes.append(N("soil_carbon", 2, "d_soil", "Soil Organic Matter & Carbon",
    "The amount of living and once-living carbon in your soil — the dark, spongy stuff that feeds microbes and holds water.",
    "Organic matter is the single best summary of soil function: more carbon means more fertility, water storage and resilience, and it underpins carbon markets.",
    "Soil organic matter % and its multi-year trend, plus lab carbon-mineralization (respiration).",
    "Accredited soil-lab test (soil test).",
    "Requires a dated lab test from georeferenced sample points; trends need repeated sampling, so one good number cannot stand in for real improvement.",
    ["Soil Health Institute — Minimum Suite of Soil Health Indicators", "USDA NRCS — 4 Soil Health Principles"]))
nodes.append(N("som_test", 3, "soil_carbon", "Soil organic matter % trend",
    "Your measured soil organic matter percentage, tracked the same way in the same spots year after year.",
    "A rising SOM trend is the clearest proof soil is actually regenerating, not just being maintained.",
    "SOM % from a standard soil test, compared to a baseline from the same GPS-tagged points.",
    "Soil test (accredited lab).",
    "Fixed, georeferenced sample locations and lab chain-of-custody stop cherry-picking the best patch of the field.",
    ["Soil Health Institute — Minimum Suite of Soil Health Indicators"]))
nodes.append(N("soil_respiration", 3, "soil_carbon", "Soil biological activity (respiration)",
    "How much your soil 'breathes' — a quick lab test of how alive the soil microbes are.",
    "Living soil cycles nutrients for free; respiration responds faster than carbon, so it is an early sign practices are working.",
    "CO2 burst / carbon-mineralization from a rewetted soil sample (e.g. 24-hour respiration).",
    "Soil test (lab).",
    "Run by a lab on a submitted sample; hard to spoof without genuinely biologically active soil.",
    ["Soil Health Institute — Minimum Suite of Soil Health Indicators"]))

nodes.append(N("soil_cover", 2, "d_soil", "Soil Cover / Armor",
    "Keeping the soil surface covered with living plants or crop residue instead of leaving bare dirt.",
    "Bare soil bakes, erodes and loses carbon; NRCS calls cover 'soil armor', the first principle of soil health.",
    "Percentage of the year and of the field that stays covered by residue or living plants.",
    "Dated field photos + satellite NDVI (photo evidence / satellite).",
    "A satellite time-series shows cover across the whole field on real dates, so a single staged photo of a covered strip will not hold up.",
    ["USDA NRCS — 4 Soil Health Principles", "Savory Institute — Ecological Outcome Verification (EOV)"]))
nodes.append(N("residue_cover", 3, "soil_cover", "Year-round ground cover %",
    "How much of your ground stays covered by living plants or mulch/residue through the whole year, including winter.",
    "Continuous cover protects soil, feeds microbes and stops erosion between cash crops.",
    "Estimated % ground cover across the year (ROC-style bands: 25-50 / 50-75 / 75-100%).",
    "Satellite NDVI + dated photos; ROC audit for certified farms.",
    "Whole-field satellite coverage over the calendar year is hard to fake and is audited under ROC.",
    ["Regenerative Organic Certified — Framework (3 pillars)", "USDA NRCS — 4 Soil Health Principles"]))
nodes.append(N("bare_soil", 3, "soil_cover", "Bare-soil / erosion check",
    "Spotting and reducing patches of bare, exposed or eroding soil.",
    "Bare soil is where carbon and topsoil are lost first; EOV uses bare-ground as a core leading indicator.",
    "% bare ground along a fixed transect / photo points, plus visible erosion (rills, gullies).",
    "Photo evidence + self-report with spot-audit; EOV short-term monitoring.",
    "Transect-based, geolocated photo points sampled by a monitor make selective framing hard.",
    ["Savory Institute — Ecological Outcome Verification (EOV)"]))

nodes.append(N("tillage", 2, "d_soil", "Tillage & Disturbance",
    "How much you physically disturb the soil by plowing, digging or discing.",
    "Tillage breaks soil structure and burns organic matter; minimizing disturbance is NRCS principle two.",
    "Number and depth of tillage passes per year, and the share of acres in no-till / reduced-till.",
    "Equipment/operation logs + receipts, with self-report and spot-audit.",
    "Tillage leaves visible signatures (residue burial, broken structure) that a monitor or satellite can corroborate against the claim.",
    ["USDA NRCS — 4 Soil Health Principles", "Regenified — 6-3-4 Verification Standard"]))
nodes.append(N("tillage_passes", 3, "tillage", "Tillage intensity (passes/year)",
    "How many times, and how deep, you turn the soil each season.",
    "Fewer, shallower passes mean less carbon lost and less structural damage.",
    "Count of tillage operations per field per year and their depth.",
    "Operation log / equipment receipts (self-report + spot-audit).",
    "Cross-checked against fuel/equipment use and the visible degree of residue incorporation in the field.",
    ["USDA NRCS — 4 Soil Health Principles"]))
nodes.append(N("no_till_planting", 3, "tillage", "No-till / direct seeding",
    "Planting straight into last year's residue without plowing first.",
    "No-till is the gold-standard low-disturbance practice (ROC Gold requires it).",
    "Share of planted acres established with no-till / direct-seed equipment.",
    "Planting records + photo of residue at planting; ROC audit.",
    "Residue left standing at planting is physically visible on the surface and in imagery.",
    ["Regenerative Organic Certified — Framework (3 pillars)", "USDA NRCS — 4 Soil Health Principles"]))

nodes.append(N("living_roots", 2, "d_soil", "Living Roots",
    "Keeping something growing with live roots in the ground for as much of the year as possible.",
    "Living roots feed soil microbes year-round (NRCS principle four) and are what actually build soil carbon.",
    "Number of days per year the field has a living root, and whether cover crops fill the gaps between cash crops.",
    "Cropping calendar + satellite NDVI green-up.",
    "Satellite greenness confirms when the field was actually growing, not just the planting intention.",
    ["USDA NRCS — 4 Soil Health Principles", "Regenified — 6-3-4 Verification Standard"]))
nodes.append(N("cover_crop", 3, "living_roots", "Cover cropping",
    "Growing a non-cash crop (rye, clover, or a diverse mix) to protect and feed the soil between main crops.",
    "Cover crops deliver cover, living roots and diversity all at once — the workhorse regenerative practice.",
    "Acres and species of cover crop planted, and whether it is a single species or a diverse mix.",
    "Seed receipts + dated photos + NDVI (receipts / satellite).",
    "Seed-purchase receipts plus satellite green-up in the off-season are hard to fabricate together.",
    ["USDA NRCS — 4 Soil Health Principles", "Regenified — 6-3-4 Verification Standard"]))
nodes.append(N("living_root_days", 3, "living_roots", "Continuous living-root days",
    "The number of days each year your ground has a living, growing root in it.",
    "More living-root days is the most direct driver of soil carbon gain.",
    "Days/year with green, growing cover, derived from the cropping calendar and NDVI.",
    "Satellite NDVI time-series + cropping calendar.",
    "Derived from independent satellite greenness, not just the farmer's word.",
    ["USDA NRCS — 4 Soil Health Principles", "Savory Institute — Ecological Outcome Verification (EOV)"]))

nodes.append(N("water_infiltration", 2, "d_soil", "Water Infiltration & Structure",
    "How quickly rain soaks into your soil instead of running off — a sign of good structure.",
    "Well-structured soil captures water, resists drought and flooding, and holds nutrients (an EOV lagging indicator).",
    "Infiltration rate (minutes for an inch of water) and soil aggregate stability.",
    "In-field infiltration ring test + lab aggregate-stability test.",
    "Ring-infiltration and slake tests are done on-site or in a lab on real soil and cannot be talked up.",
    ["Soil Health Institute — Minimum Suite of Soil Health Indicators", "Savory Institute — Ecological Outcome Verification (EOV)"]))
nodes.append(N("infiltration_test", 3, "water_infiltration", "Water infiltration rate",
    "A simple ring-and-stopwatch test of how fast an inch of water sinks into your soil.",
    "Faster infiltration means more rain captured and less erosion — you feel it in a dry year.",
    "Time for a fixed volume of water to infiltrate, repeated at set points.",
    "In-field infiltration ring test (self-report + spot-audit); EOV long-term monitoring.",
    "Standardized method at georeferenced points, ideally witnessed by a monitor.",
    ["Savory Institute — Ecological Outcome Verification (EOV)", "USDA NRCS — 4 Soil Health Principles"]))
nodes.append(N("aggregate_stability", 3, "water_infiltration", "Soil aggregate stability",
    "How well your soil crumbs hold together when wet instead of turning to mud (the 'slake test').",
    "Stable aggregates mean good structure, aeration and erosion resistance — a core SHI indicator.",
    "Aggregate-stability score from a lab or a standardized slake test.",
    "Soil test (lab) or witnessed slake test.",
    "Lab-measured on submitted soil; reflects real long-term biology, not a quick fix.",
    ["Soil Health Institute — Minimum Suite of Soil Health Indicators"]))

# ---------- DIVERSITY: factors + indicators ----------
nodes.append(N("crop_diversity", 2, "d_diversity", "Crop & Rotational Diversity",
    "Growing many different crops and rotating them through your fields instead of the same one every year.",
    "Rotational diversity breaks pest cycles, spreads risk and feeds soil biology (NRCS principle three; ROC counts crops in rotation).",
    "Number of distinct crops grown and number of crops in each field's rotation.",
    "Planting/harvest records + aerial imagery.",
    "Crop identity is visible in imagery and provable by harvest and sales records.",
    ["USDA NRCS — 4 Soil Health Principles", "Regenerative Organic Certified — Framework (3 pillars)"]))
nodes.append(N("rotation_length", 3, "crop_diversity", "Crops in rotation",
    "How many different crops you cycle through the same ground over a few years.",
    "Longer rotations (ROC Gold wants 7+) mean healthier soil and fewer pests; a 5-crop Alberta rotation already scores well.",
    "Count of distinct crops in the field's multi-year rotation.",
    "Field-history records; ROC audit.",
    "Multi-year field histories are cross-checked against imagery of what actually grew.",
    ["Regenerative Organic Certified — Framework (3 pillars)", "USDA NRCS — 4 Soil Health Principles"]))
nodes.append(N("polyculture", 3, "crop_diversity", "Intercropping / polyculture",
    "Growing more than one crop in the same field at once — a mixed market-garden bed, companion planting, or alley cropping.",
    "Mixing species in space, not just time, boosts diversity and yield stability on small plots.",
    "Presence and area of intercropped or multi-species plantings.",
    "Dated photos + planting map (photo evidence).",
    "Visible in the field and in close photos; small-plot layouts are auditable in a single visit.",
    ["FAO / Alliance Bioversity-CIAT — Agrobiodiversity Index"]))

nodes.append(N("genetic_diversity", 2, "d_diversity", "Genetic & Varietal Diversity",
    "How many different varieties and breeds you keep — including old, rare and locally-adapted ones.",
    "Genetic diversity protects against disease wipe-outs and conserves heritage genetics (FAO tracks genetic erosion).",
    "Number of crop varieties and livestock breeds, plus presence of heirloom / rare genetics.",
    "Seed/breed receipts + a variety list.",
    "Variety and breed claims tie to seed/stock purchase records and are visually distinct on a visit.",
    ["FAO / Alliance Bioversity-CIAT — Agrobiodiversity Index"]))
nodes.append(N("varietal_count", 3, "genetic_diversity", "Varieties & breeds kept",
    "The number of distinct crop varieties and animal breeds on your farm.",
    "More genetic options mean more resilience to new pests, disease and climate swings.",
    "Count of named varieties/breeds actively grown or raised.",
    "Seed/stock receipts + self-report with spot-audit.",
    "Backed by purchase records; an on-farm spot-check confirms they are actually present.",
    ["FAO / Alliance Bioversity-CIAT — Agrobiodiversity Index"]))
nodes.append(N("heritage_seed", 3, "genetic_diversity", "Heirloom / rare & adapted genetics",
    "Growing open-pollinated or heirloom seed and keeping rare or heritage animal breeds, and saving your own seed.",
    "These genetics are being lost globally; keeping them is real conservation and often better local performance.",
    "Presence of open-pollinated/heirloom lines or recognized rare breeds, and seed-saving.",
    "Seed-source records, breed registries (third-party cert / receipts).",
    "Rare-breed registries and heirloom seed sources are documented and independently verifiable.",
    ["FAO / Alliance Bioversity-CIAT — Agrobiodiversity Index"]))

nodes.append(N("income_diversity", 2, "d_diversity", "Enterprise & Income Diversity",
    "How many different products or income streams your farm sells, so you are not betting everything on one commodity.",
    "Enterprise diversity is what frees a farmer from commodity lock-in — the whole point of Farmer Drop for the producer.",
    "Number of distinct revenue-generating enterprises and how concentrated income is in the top one.",
    "Sales / accounting records (receipts / self-report + spot-audit).",
    "Income mix is provable from real sales ledgers, not from claims.",
    ["FAO / Alliance Bioversity-CIAT — Agrobiodiversity Index", "Regenerative Organic Certified — Framework (3 pillars)"]))
nodes.append(N("enterprise_count", 3, "income_diversity", "Distinct enterprises",
    "How many separate things you sell — vegetables, beef, eggs, honey, value-added goods, agritourism, and so on.",
    "Each independent enterprise is a buffer when one crop or market fails.",
    "Count of enterprises contributing a meaningful share of revenue.",
    "Accounting records (self-report + spot-audit).",
    "Tied to actual sales lines; a token enterprise with no sales does not count.",
    ["FAO / Alliance Bioversity-CIAT — Agrobiodiversity Index"]))
nodes.append(N("revenue_concentration", 3, "income_diversity", "Income concentration",
    "What share of your money comes from your single biggest product.",
    "A farm earning 90% from one crop is fragile; lower concentration means more resilience.",
    "Revenue share of the top enterprise (lower is more diverse).",
    "Accounting / sales records.",
    "Computed from the full sales ledger, so hiding concentration means falsifying the accounts.",
    ["FAO / Alliance Bioversity-CIAT — Agrobiodiversity Index"]))

nodes.append(N("habitat_diversity", 2, "d_diversity", "Habitat & Non-crop Biodiversity",
    "The wild edges of your farm — hedgerows, buffer strips, ponds, trees and flowering habitat that are not crops.",
    "Non-crop habitat hosts pollinators and pest predators and is a headline agrobiodiversity indicator (landscape complexity).",
    "Area and connectivity of non-crop habitat, plus presence of pollinator/beneficial habitat.",
    "Aerial / satellite imagery + field map.",
    "Habitat area and hedgerows are directly visible from the air and persistent over time.",
    ["FAO / Alliance Bioversity-CIAT — Agrobiodiversity Index", "Savory Institute — Ecological Outcome Verification (EOV)"]))
nodes.append(N("non_crop_habitat", 3, "habitat_diversity", "Non-crop habitat & buffers",
    "Set-aside strips, hedgerows, woodlots, wetlands and field margins left for nature.",
    "These refuges drive on-farm biodiversity and natural pest control, reducing the need to spray.",
    "% of farm area and length of edges in permanent non-crop habitat.",
    "Satellite / aerial imagery + farm map.",
    "Persistent habitat features are unmistakable in multi-date imagery.",
    ["FAO / Alliance Bioversity-CIAT — Agrobiodiversity Index"]))
nodes.append(N("pollinator_habitat", 3, "habitat_diversity", "Pollinator & beneficial habitat",
    "Flowering strips, insectaries and undisturbed nesting areas that support bees and beneficial insects.",
    "Pollinators and predator insects are free labor; supporting them lifts yield and cuts pesticide use.",
    "Presence and area of flowering/beneficial habitat and reduced-mowing zones.",
    "Dated photos in bloom + map (photo evidence).",
    "Seasonal bloom photos plus mapped locations are checkable on a site visit.",
    ["FAO / Alliance Bioversity-CIAT — Agrobiodiversity Index"]))

nodes.append(N("market_diversity", 2, "d_diversity", "Market-channel Diversity",
    "How many different ways you sell — farmers markets, CSA, direct-to-eater, restaurants, wholesale, and Farmer Drop itself.",
    "Multiple channels protect a farm if one buyer walks, and direct channels capture the margin Farmer Drop is built to return.",
    "Number of active sales channels and the share sold direct-to-eater.",
    "Sales records by channel (receipts / self-report + spot-audit).",
    "Channel mix is provable from invoices and platform records.",
    ["FAO / Alliance Bioversity-CIAT — Agrobiodiversity Index"]))
nodes.append(N("channel_count", 3, "market_diversity", "Active market channels",
    "The number of distinct places or ways you actually sell your product.",
    "More channels means less dependence on any single buyer or price.",
    "Count of channels with real sales in the last year.",
    "Sales records by channel.",
    "Each channel must show real transactions to count.",
    ["FAO / Alliance Bioversity-CIAT — Agrobiodiversity Index"]))
nodes.append(N("direct_sales_share", 3, "market_diversity", "Direct-to-eater share",
    "How much of what you sell goes straight to the person who eats it, versus through middlemen.",
    "Direct sales are where farmers keep the most margin — the core wedge of the Farmer Drop model.",
    "% of revenue sold direct (market, CSA, on-platform).",
    "Sales records; Farmer Drop platform data.",
    "Platform and invoice records make the direct share directly measurable.",
    ["FAO / Alliance Bioversity-CIAT — Agrobiodiversity Index"]))

# ---------- OPERATING PRACTICES: factors + indicators ----------
nodes.append(N("input_reduction", 2, "d_practices", "Input Use & Chemical Reduction",
    "Cutting back on synthetic pesticides, herbicides and fungicides, and the chemicals that harm soil life.",
    "Reducing biocides is central to regenerative and organic standards; it protects soil biology and beneficial insects.",
    "Quantity of synthetic pesticide/herbicide applied per acre, and use of IPM instead of routine spraying.",
    "Input-purchase receipts + spray records (receipts).",
    "Purchase receipts and mandated spray logs bound how much could have been applied.",
    ["Regenerative Organic Certified — Framework (3 pillars)", "FAO / Alliance Bioversity-CIAT — Agrobiodiversity Index"]))
nodes.append(N("synthetic_inputs", 3, "input_reduction", "Synthetic pesticide/herbicide reduction",
    "How little synthetic pesticide and herbicide you use per acre, ideally trending toward none.",
    "These chemicals are the biggest disruptor of soil and insect life; less is directly regenerative.",
    "Active-ingredient quantity per acre per year, and % of acres treated.",
    "Purchase receipts + spray logs (receipts / self-report + spot-audit).",
    "Bounded by purchase records and regulator-required application logs; over-claiming means underreporting purchases.",
    ["Regenerative Organic Certified — Framework (3 pillars)", "FAO / Alliance Bioversity-CIAT — Agrobiodiversity Index"]))
nodes.append(N("ipm", 3, "input_reduction", "Integrated pest management",
    "Managing pests with scouting, thresholds, beneficial insects and rotation before reaching for a spray.",
    "IPM proves reductions come from real management, not luck, and it is durable.",
    "Documented scouting/threshold records and use of biological and cultural controls.",
    "Scouting logs + advisor records (self-report + spot-audit).",
    "Contemporaneous scouting logs and advisor sign-off are harder to backfill than a simple claim.",
    ["Regenerative Organic Certified — Framework (3 pillars)"]))

nodes.append(N("nutrient_mgmt", 2, "d_practices", "Nutrient Management",
    "Feeding your crops with compost, manure and precise, soil-test-based fertility instead of blanket synthetic fertilizer.",
    "Good nutrient management builds soil, cuts runoff and pollution, and saves money.",
    "Use of organic amendments, a nutrient budget matched to soil tests, and reduced synthetic nitrogen.",
    "Amendment receipts + soil-test-based nutrient plan (receipts / soil test).",
    "Compost/manure volumes and a soil-test-linked plan are documented and physically visible.",
    ["USDA NRCS — 4 Soil Health Principles", "Regenerative Organic Certified — Framework (3 pillars)"]))
nodes.append(N("compost_manure", 3, "nutrient_mgmt", "Compost & organic amendments",
    "Adding compost, well-managed manure or other organic matter to feed the soil.",
    "Organic amendments build the carbon and biology that synthetic fertilizer alone cannot.",
    "Tons/acre of compost or manure applied, and whether composting happens on-farm.",
    "Amendment receipts / compost logs + photos.",
    "Volumes tie to receipts or to an on-site compost operation you can inspect.",
    ["Regenerative Organic Certified — Framework (3 pillars)", "USDA NRCS — 4 Soil Health Principles"]))
nodes.append(N("nutrient_budget", 3, "nutrient_mgmt", "Soil-test-based fertility",
    "Applying nutrients to a plan built from soil tests, so you add what the crop needs and no more.",
    "Right-rate, right-time fertility prevents the over-application that pollutes water and wastes money.",
    "A current nutrient budget tied to recent soil tests, and synthetic-N rate versus crop need.",
    "Soil test + written nutrient plan (soil test / self-report).",
    "The plan must reference dated lab soil tests, anchoring claims to real data.",
    ["USDA NRCS — 4 Soil Health Principles"]))

nodes.append(N("grazing_integration", 2, "d_practices", "Grazing & Livestock Integration",
    "Using animals well — moving them across pasture and integrating them with crops so they build soil instead of degrading it.",
    "Adaptive grazing and crop-livestock integration are central to Savory/Regenified and turn animals into a soil-building tool.",
    "Rotational/adaptive grazing in place, and livestock integrated onto cropland (grazing residues / cover crops).",
    "Grazing charts + photos (self-report + spot-audit); EOV.",
    "Pasture recovery and even utilization are visible in the field and in imagery over a season.",
    ["Savory Institute — Ecological Outcome Verification (EOV)", "Regenified — 6-3-4 Verification Standard", "Regenerative Organic Certified — Framework (3 pillars)"]))
nodes.append(N("rotational_grazing", 3, "grazing_integration", "Rotational / adaptive grazing",
    "Moving livestock through paddocks and giving grass time to fully recover before grazing it again.",
    "Planned recovery grows more grass, more roots and more soil carbon than continuous grazing — the Savory core.",
    "Evidence of paddock moves, rest periods, and the residual cover left after grazing.",
    "Grazing chart / move records + pasture photos (self-report + spot-audit); EOV monitoring.",
    "Rested paddocks and left residual are physically visible; EOV transects verify pasture condition independently.",
    ["Savory Institute — Ecological Outcome Verification (EOV)", "Noble Research Institute — 6 Soil Health Principles"]))
nodes.append(N("crop_livestock", 3, "grazing_integration", "Crop-livestock integration",
    "Grazing animals on cover crops or crop residues, or rotating pasture and cropland.",
    "Integration recycles nutrients on-farm, adds diversity and living roots, and cuts input costs.",
    "Acres where livestock graze cover crops/residues or rotate with cropping.",
    "Field records + photos (self-report + spot-audit).",
    "Animal impact (dung, grazed residue) is visible on the specific fields claimed.",
    ["USDA NRCS — 4 Soil Health Principles", "Regenified — 6-3-4 Verification Standard"]))

nodes.append(N("water_stewardship", 2, "d_practices", "Water Stewardship",
    "Using irrigation water efficiently and protecting streams, ponds and wetlands on and near your land.",
    "Water is the limiting resource on many farms; efficiency and waterway protection safeguard the whole watershed.",
    "Irrigation efficiency (water applied vs crop need) and protected/buffered waterways.",
    "Water-meter readings + aerial imagery of buffers.",
    "Metered water use and visible riparian buffers are both independently checkable.",
    ["Savory Institute — Ecological Outcome Verification (EOV)", "Regenerative Organic Certified — Framework (3 pillars)"]))
nodes.append(N("irrigation_efficiency", 3, "water_stewardship", "Irrigation efficiency",
    "Getting more crop per drop — using drip, scheduling and soil-moisture data instead of over-watering.",
    "Efficient irrigation saves water and money and prevents nutrient leaching.",
    "Water applied per acre versus crop requirement, and efficient-irrigation tech in use.",
    "Water-meter / utility readings (self-report + spot-audit).",
    "Anchored to metered volumes, which are hard to overstate downward.",
    ["Regenerative Organic Certified — Framework (3 pillars)"]))
nodes.append(N("riparian_buffer", 3, "water_stewardship", "Waterway protection & buffers",
    "Keeping vegetated buffer strips and fencing livestock out of streams, ponds and wetlands.",
    "Buffers filter runoff, stop erosion and protect the water everyone downstream drinks.",
    "Presence and width of vegetated buffers along waterways, and livestock exclusion.",
    "Aerial imagery + field map (satellite / photo evidence).",
    "Buffer strips and stream fencing are clearly visible in imagery and on the ground.",
    ["Savory Institute — Ecological Outcome Verification (EOV)", "Regenerative Organic Certified — Framework (3 pillars)"]))

nodes.append(N("waste_energy", 2, "d_practices", "Waste & Energy",
    "Recycling on-farm waste back into the land and using energy efficiently or from renewable sources.",
    "Closing waste loops and cutting fossil energy shrink the farm's footprint and often its costs.",
    "On-farm organic recycling/composting, plus energy source and efficiency measures.",
    "Utility bills + photos of composting/renewables (receipts / photo evidence).",
    "Energy bills and visible composting or solar installations are concrete evidence.",
    ["Regenerative Organic Certified — Framework (3 pillars)"]))
nodes.append(N("organic_recycling", 3, "waste_energy", "On-farm waste recycling",
    "Turning crop residues, manure and food waste into compost or feed instead of dumping or burning them.",
    "Recycling nutrients on-farm builds soil and removes disposal cost and pollution.",
    "Share of organic waste composted / reused on-farm, and no residue burning.",
    "Photos + compost logs (photo evidence / self-report).",
    "An on-site composting operation is inspectable; burning leaves visible scorch and satellite heat signatures.",
    ["Regenerative Organic Certified — Framework (3 pillars)"]))
nodes.append(N("energy_use", 3, "waste_energy", "Energy source & efficiency",
    "Where your farm's energy comes from and how efficiently you use fuel and power.",
    "Renewable and efficient energy cuts both emissions and one of a farm's biggest bills.",
    "Renewable energy on-farm, and fuel/electricity use per unit of output.",
    "Utility bills + equipment records (receipts / self-report).",
    "Utility statements and visible solar/wind installations back the claim.",
    ["Regenerative Organic Certified — Framework (3 pillars)"]))

# ---------- ANIMAL WELFARE: factors + indicators ----------
nodes.append(N("pasture_access", 2, "d_animal", "Pasture Access & Living Conditions",
    "Animals actually living outdoors on pasture with room to move, not confined in feedlots or cages.",
    "Pasture-based systems are required under ROC (no CAFOs) and are what make grazing regenerative.",
    "Time on pasture and space per animal, and the absence of confinement (CAFO).",
    "Site audit + photos (third-party cert / photo evidence).",
    "Confinement infrastructure and herd condition are obvious on an unannounced visit.",
    ["Regenerative Organic Certified — Framework (3 pillars)"]))
nodes.append(N("outdoor_time", 3, "pasture_access", "Time on pasture / outdoor access",
    "How much of the year your animals are actually out on living pasture.",
    "Genuine pasture time is the difference between regenerative grazing and industrial confinement.",
    "Days/year and hours/day of real pasture / outdoor access.",
    "Site audit + grazing records (third-party cert / self-report + spot-audit).",
    "Pasture wear, dung distribution and animal condition corroborate the claimed time outdoors.",
    ["Regenerative Organic Certified — Framework (3 pillars)"]))
nodes.append(N("stocking_density", 3, "pasture_access", "Stocking density / space",
    "Giving each animal enough room, so pastures and barns are not overcrowded.",
    "Appropriate space is a welfare basic and prevents the pasture damage of overstocking.",
    "Animals per acre / per area versus recognized welfare standards.",
    "Herd count + measured area (site audit).",
    "A head-count against measured area on a site visit is straightforward to verify.",
    ["Regenerative Organic Certified — Framework (3 pillars)"]))

nodes.append(N("animal_health", 2, "d_animal", "Animal Health & Low-stress Handling",
    "Keeping animals healthy through good conditions and gentle handling, without routine painful alterations or heavy antibiotics.",
    "ROC bans routine mutilations (beak-trimming, tail-docking, dehorning, mulesing) and rewards preventive health over drugs.",
    "Absence of routine physical alterations, low-stress handling, and a preventive-health / low-antibiotic record.",
    "Veterinary records + site audit (third-party cert / vet records).",
    "Physical alterations and drug use are visible on animals and in vet/treatment records.",
    ["Regenerative Organic Certified — Framework (3 pillars)"]))
nodes.append(N("no_mutilation", 3, "animal_health", "No routine physical alterations",
    "Not doing painful routine procedures like beak-trimming, tail-docking, dehorning or mulesing.",
    "Avoiding these is a core ROC animal-welfare requirement and a clear welfare marker.",
    "Herd/flock free of prohibited alterations, with pain relief where a procedure is unavoidable.",
    "Site audit / visual inspection (third-party cert).",
    "Alterations are physically evident on the animals themselves.",
    ["Regenerative Organic Certified — Framework (3 pillars)"]))
nodes.append(N("preventive_health", 3, "animal_health", "Preventive health & low antibiotic use",
    "Keeping animals well through good living conditions, so you rarely need antibiotics — and never as routine growth promoters.",
    "Preventive health signals genuine welfare and avoids the antibiotic overuse that drives resistance.",
    "Antibiotic/medication use per animal, and no routine or prophylactic dosing.",
    "Veterinary & treatment records (vet records / third-party cert).",
    "Treatment logs and vet records document real drug use; residues are testable.",
    ["Regenerative Organic Certified — Framework (3 pillars)"]))

# ---------- COMMUNITY: factors + indicators ----------
nodes.append(N("fair_labor", 2, "d_community", "Fair Labor & Worker Wellbeing",
    "Paying a fair, living wage, keeping work safe, and never using forced or child labor.",
    "Social fairness is a required ROC pillar — regenerative cannot rest on exploited people.",
    "Wage levels versus a living-wage benchmark, the safety record, and no forced/child labor.",
    "Payroll records + worker interviews (third-party cert / audit).",
    "Payroll audits and confidential worker interviews are far harder to fake than a self-declaration.",
    ["Regenerative Organic Certified — Framework (3 pillars)"]))
nodes.append(N("living_wage", 3, "fair_labor", "Living wage & safe conditions",
    "Workers earn at least a local living wage and work in safe, dignified conditions.",
    "Fair pay and safety are the baseline of a just farm and a required certification criterion.",
    "Wages versus a recognized living-wage benchmark, plus documented safety practices.",
    "Payroll records + site safety audit (third-party cert).",
    "Payroll records and worker interviews cross-check the stated wages.",
    ["Regenerative Organic Certified — Framework (3 pillars)"]))
nodes.append(N("no_forced_labor", 3, "fair_labor", "No forced or child labor",
    "No forced, bonded or child labor anywhere in the operation, including seasonal crews.",
    "This is a non-negotiable floor for any credible fairness claim.",
    "Documented labor practices, freedom of association, and age verification.",
    "Audit + worker interviews (third-party cert).",
    "Independent worker interviews and documentation audits detect coercion that a form cannot.",
    ["Regenerative Organic Certified — Framework (3 pillars)"]))

nodes.append(N("local_economy", 2, "d_community", "Local Economy & Access",
    "Selling into the local foodshed and making sure real people in the community can actually afford and get the food.",
    "Short local supply chains keep money and food in the community — the point of a decentralized food network.",
    "Food miles / local sales share, plus affordability and community-access programs.",
    "Sales-geography records + program documentation (platform data / self-report).",
    "Delivery geography and program participation are documented in platform and sales records.",
    ["FAO / Alliance Bioversity-CIAT — Agrobiodiversity Index", "Regenerative Organic Certified — Framework (3 pillars)"]))
nodes.append(N("food_miles", 3, "local_economy", "Local sourcing / food miles",
    "How close your eaters are to your farm — how far the food travels to reach them.",
    "Shorter distances mean fresher food, lower emissions and a stronger local economy.",
    "Share of sales within a defined local radius, and average delivery distance.",
    "Sales-geography / platform delivery data.",
    "Delivery addresses and platform logistics data make distances directly measurable.",
    ["FAO / Alliance Bioversity-CIAT — Agrobiodiversity Index"]))
nodes.append(N("community_access", 3, "local_economy", "Affordability & community access",
    "Making your food reachable for ordinary local people — through fair pricing, SNAP/coupon acceptance, gleaning or donation.",
    "Regenerative food that only the wealthy can buy fails the community half of the mission.",
    "Participation in access programs, and the share of product reaching lower-income channels.",
    "Program records + sales data (self-report + spot-audit).",
    "Program enrollment and transaction records document real access, not intentions.",
    ["Regenerative Organic Certified — Framework (3 pillars)"]))

# ---- compute domain on each node ----
by_id = {n["id"]: n for n in nodes}
def domain_of(n):
    if n["tier"] == 0:
        return "root"
    c = n
    while c["tier"] > 1:
        c = by_id[c["parent"]]
    return c["id"]
for n in nodes:
    n["domain"] = domain_of(n)

# ---- structural edges from parent + tier ----
edges = []
for n in nodes:
    if n["parent"] is None:
        continue
    rel = "evidenced_by" if n["tier"] == 3 else "comprises"
    edges.append({"from": n["parent"], "to": n["id"], "relation": rel})

# ---- cross-domain related edges ----
related = [
    ("cover_crop", "crop_diversity", "cover crops add crop diversity"),
    ("living_root_days", "soil_carbon", "living roots build soil carbon"),
    ("compost_manure", "soil_carbon", "amendments build soil carbon"),
    ("rotational_grazing", "soil_cover", "grazing manages residue / soil cover"),
    ("crop_livestock", "crop_diversity", "livestock integration adds diversity"),
    ("synthetic_inputs", "soil_respiration", "chemical reduction protects soil biology"),
    ("non_crop_habitat", "riparian_buffer", "habitat and waterway buffers overlap"),
    ("pollinator_habitat", "ipm", "beneficial habitat supports pest management"),
    ("direct_sales_share", "local_economy", "direct sales feed the local economy"),
    ("grazing_integration", "living_roots", "planned grazing keeps roots growing"),
]
for a, b, why in related:
    edges.append({"from": a, "to": b, "relation": "related", "note": why})

# ---- tier counts ----
counts = {0: 0, 1: 0, 2: 0, 3: 0}
for n in nodes:
    counts[n["tier"]] += 1

meta = {
    "title": "Drop Score — Regenerative Factor-Model Knowledge Graph",
    "purpose": "The sub-graph behind the 'Drop Score' node of the Farmer Drop knowledge map: a guidance tree that defines, in fine-grained evaluable terms, what regenerative operating practices actually mean for a small producer.",
    "no_weights_note": "This is a knowledge graph, not a scoring formula. There are deliberately NO weights and NO scores. Each node defines a concept and states what evidence would demonstrate it. A Drop Score is the transparent set of indicators a producer can evidence, never a single opaque number.",
    "structure": "4 tiers: (0) root, (1) domains, (2) factors, (3) fine-grained evaluable indicators. Edges: 'comprises' (root->domain, domain->factor), 'evidenced_by' (factor->indicator), and cross-domain 'related' links.",
    "tier_counts": {"tier_0_root": counts[0], "tier_1_domains": counts[1],
                    "tier_2_factors": counts[2], "tier_3_indicators": counts[3]},
    "domains": ["Regenerative — Soil", "Diversity", "Operating Practices",
                "Animal & Livestock Welfare", "Community & Local Economy"],
    "sources": SOURCES,
}

graph = {"meta": meta, "nodes": nodes, "edges": edges}

json_str = json.dumps(graph, indent=2, ensure_ascii=False)
with open(os.path.join(HERE, "drop_score_graph.json"), "w", encoding="utf-8") as f:
    f.write(json_str + "\n")

# ---- HTML (JSON inlined identically) ----
with open(os.path.join(HERE, "_drop_score_template.html"), "r", encoding="utf-8") as f:
    template = f.read()
html = template.replace("__GRAPH_JSON__", json_str)
with open(os.path.join(HERE, "drop_score.html"), "w", encoding="utf-8") as f:
    f.write(html)

print("nodes:", len(nodes), "edges:", len(edges))
print("tier counts:", counts)
print("comprises:", sum(1 for e in edges if e['relation'] == 'comprises'),
      "evidenced_by:", sum(1 for e in edges if e['relation'] == 'evidenced_by'),
      "related:", sum(1 for e in edges if e['relation'] == 'related'))
