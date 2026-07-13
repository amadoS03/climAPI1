# ClimaAPI — Pronóstico Dinámico del Clima

Proyecto académico que consume la API pública y gratuita **[Open-Meteo](https://open-meteo.com)** (sin necesidad de API key) para mostrar el pronóstico del clima de cualquier ciudad, con un listado de datos que se filtra dinámicamente según la categoría seleccionada (Clima Actual / Por Horas / Próximos 7 Días).

## Estructura del proyecto

```
├── index.html        # Estructura principal
├── css/style.css      # Estilos y diseño responsivo
├── js/app.js           # Consumo de la API y lógica de filtrado por categoría
└── README.md
```

## Endpoints utilizados

| Endpoint | Uso |
|---|---|
| `GET geocoding-api.open-meteo.com/v1/search?name={ciudad}` | Convierte el nombre de la ciudad en coordenadas (lat/lon) |
| `GET api.open-meteo.com/v1/forecast?latitude=...&longitude=...` | Obtiene clima actual, pronóstico por horas y diario |

## Categorías dinámicas

- **Clima Actual**: temperatura, humedad y viento en este momento.
- **Por Horas**: pronóstico de las próximas 24 horas.
- **Próximos 7 Días**: temperatura máxima/mínima y condición por día.
