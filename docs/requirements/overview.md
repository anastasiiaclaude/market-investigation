# Requirements Overview

## Goal

Web dashboard for competitive analysis of the **VA-INDIGO Analysis Suite** product by **VON ARDENNE GmbH**.

The dashboard lets you visualize and manage competitor data: compare their functionality with VA-INDIGO, identify missing features, and track market opportunities.

## Company — VON ARDENNE GmbH

- **Website:** https://vonardenne.de/
- **Industry:** Manufacturing of vacuum coating equipment for thin-film coatings
- **Product under analysis:** VA-INDIGO Analysis Suite — https://vonardenne.de/digitale-loesungen/va-indigo/
- **Target markets:** solar energy, semiconductors, hydrogen and fuel cells, batteries, architectural glazing, displays, aerospace
- **Scale:** >1000 systems in 50+ countries, 6 locations (Dresden HQ + China, India, Malaysia, USA, Vietnam)

## VA-INDIGO Analysis Suite product

A set of four software modules for monitoring and analyzing production data:

| Module | Purpose |
|---|---|
| **VA Dashboard** | Real-time display of key production KPIs |
| **VA ProcessDB Interface** | Connection to machine data, integration of production systems |
| **VA ProcessDB Trend & Exporter** | Trend visualization, data export for further analysis |
| **VA Vacuum Analyzer** | Vacuum quality assessment in production processes |

## Primary user

A single user (product manager), runs it locally in the browser.

## Success criteria

- Competitor data is displayed in a structured way
- Competitors can be compared with VA-INDIGO across key functional areas
- Identified gaps are clearly visible (strong / adequate / weak / absent matrix)
- The dashboard runs locally with no extra infrastructure

## MVP scope

- Comparison table and competitor cards
- Backend as Vercel serverless functions + Postgres (Neon) for persistence, jobs, and integrations — see [ADR 002](../decisions/002-add-backend.md), [ADR 003](../decisions/003-deploy-vercel-serverless.md)
- Real-time automatic parsing of data
- Export to PDF/Excel
- Jira/Confluence integration (separate task)

## Out of scope

- Authentication and roles
- Mobile version
