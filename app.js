function initMap() {

    try {

        if (typeof L === "undefined") {
            throw new Error("Leaflet no cargó.");
        }

        if (typeof MAP_CONFIG === "undefined") {
            throw new Error("config.js no cargó.");
        }

        map = L.map('map', {
            center: MAP_CONFIG.center,
            zoom: MAP_CONFIG.zoom,
            minZoom: MAP_CONFIG.minZoom,
            maxZoom: MAP_CONFIG.maxZoom,
            maxBounds: MAP_CONFIG.bounds,
            maxBoundsViscosity: 1.0
        });

        L.tileLayer(
            'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
            {
                attribution: '&copy; CARTO'
            }
        ).addTo(map);

        markerClusterGroup =
            (typeof L.markerClusterGroup === "function")
                ? L.markerClusterGroup()
                : L.layerGroup();

        markerClusterGroup.addTo(map);

        heatmapLayer =
            (typeof L.heatLayer === "function")
                ? L.heatLayer([], {
                    radius: 25,
                    blur: 15,
                    maxZoom: 12
                })
                : null;

        if (heatmapLayer) {
            heatmapLayer.addTo(map);
        }

        const elCluster = document.getElementById("layer-cluster");
        const elHeat = document.getElementById("layer-heatmap");

        if (elCluster) {

            elCluster.addEventListener("change", (e) => {

                if (e.target.checked) {
                    map.addLayer(markerClusterGroup);
                } else {
                    map.removeLayer(markerClusterGroup);
                }

            });

        }

        if (elHeat && heatmapLayer) {

            elHeat.addEventListener("change", (e) => {

                if (e.target.checked) {
                    map.addLayer(heatmapLayer);
                } else {
                    map.removeLayer(heatmapLayer);
                }

            });

        }

        // 🔥 BLOQUEO CRÍTICO EVITADO: asegurar mapa listo
        window.__MAP_READY__ = true;

        console.log("Mapa inicializado correctamente");

    }

    catch (err) {

        console.error("Error en initMap():", err);

        // evita loader infinito si algo falla
        window.__MAP_READY__ = false;

    }

}
