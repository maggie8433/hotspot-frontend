# Taiwan Ecological Risk Map — Frontend

Interactive web frontend for the Taiwan Ecological Risk Map.

The application visualizes ecological risk, protected areas, wildlife information and stray-animal-related data across Taiwan through an interactive bilingual map.

It was developed as part of an MSc Computer Science dissertation project investigating geospatial visualization for communicating ecological risks associated with stray animals.

## Features

The platform provides:

- Interactive map of Taiwan
- City/county ecological hotspot visualization
- Hotspot risk classification
- Multiple ecological GIS layers
- Wildlife attack visualization
- Wildlife rescue centre locations
- Layer visibility controls
- Interactive map popups
- City/county labels
- Chinese and English interface
- Hotspot risk legend
- Responsive map interface

## Technology Stack

- Vue.js
- Vite
- JavaScript
- Leaflet
- Vue I18n
- HTML
- CSS
- REST API / GeoJSON

## Application Structure

The frontend communicates with the Spring Boot backend through REST APIs.

```text
Vue Frontend
     ↓
REST API
     ↓
Spring Boot Backend
     ↓
PostgreSQL / PostGIS
```

Spatial data returned by the backend is rendered using Leaflet.

## Map Layers

The map currently supports layers including:

- Hotspot Risk
- Important Wildlife Habitats
- Natural Reserve Areas
- Nature Reserves
- Terrestrial Wildlife Protected Areas
- Ecological Conservation Corridors
- State Forest Management Areas
- Forest Wildlife Distribution
- Wildlife Attacks by Stray Animals
- Wildlife Rescue Centres

Users can enable or disable individual layers through the map layer control.

## Hotspot Risk Visualization

Taiwan's cities/counties are visualized according to calculated ecological hotspot risk.

The risk legend contains five categories:

```text
Very High
High
Moderate
Low
Very Low
```

Each category is represented using a different map colour.

Selecting a city/county displays additional hotspot information, including the overall hotspot score and component scores.

## Ecological Layers

Ecological spatial datasets are retrieved from the backend as GeoJSON.

Layers are loaded when requested rather than requiring every dataset to be loaded when the map first opens.

Loaded layers are cached in the frontend so they can be shown again without unnecessarily requesting the same dataset from the backend.

## Internationalization

The platform supports:

- English
- Traditional Chinese

Vue I18n is used to manage interface translations.

Map labels and popup content are updated according to the selected language.

## Project Setup

### Prerequisites

Install Node.js and npm.

Check the installed versions:

```bash
node --version
npm --version
```

### Install Dependencies

Clone the repository and enter the project directory:

```bash
cd hotspot-frontend
```

Install dependencies:

```bash
npm install
```

### Run Development Server

```bash
npm run dev
```

Vite will display the local development URL in the terminal.

## Backend Connection

The frontend requires the Spring Boot backend to retrieve hotspot and ecological data.

For local development, the backend normally runs at:

```text
http://localhost:8080
```

For production deployment, the API base URL should point to the deployed Spring Boot service.


## Related Repository

The Spring Boot REST API and database integration are maintained in a separate repository:

```text
hotspot
```

## Research Context

This platform was developed as part of an MSc Computer Science dissertation examining:

> How effective is geospatial visualization for communicating stray animal ecological risks to the public in Taiwan?

The map integrates multiple datasets to provide an accessible city/county-level representation of ecological risk.

The visualization should not be interpreted as predicting the exact location of future wildlife attacks. The hotspot model represents aggregated indicators and available datasets.

## Data Privacy

The platform presents aggregated and publicly available ecological information.

Wildlife risk information is intentionally presented at an appropriate geographic level rather than exposing sensitive precise locations where this could create conservation or privacy concerns.

## Data Sources

The visualization uses data derived from sources including:

- Taiwan Ministry of Agriculture open data
- Stray-animal datasets
- Protected-area and ecological GIS datasets
- WildOne wildlife information

Detailed source descriptions and academic references are provided separately within the research project and dissertation.

## License

No license has currently been specified.

Unless a license is added, making this repository public does not automatically grant others permission to copy, modify, or redistribute the source code.
