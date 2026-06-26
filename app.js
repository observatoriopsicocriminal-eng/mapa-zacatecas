// app.js - Versión Restrictiva y de Visualización Limpia para el Observatorio Psicocriminal

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById('current-date').innerText = new Date().toLocaleDateString('es-MX', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'
    });

    let map, markerClusterGroup, heatmapLayer;
    let rawEventsData = [];
    let chartInstance = null;

    const PESOS_IIPS = {
        "Feminicidio": 5, "Agresión armada letal": 5, "Hallazgo de persona sin vida": 5,
        "Agresión armada no letal": 4, "Violencia familiar": 4, "Suicidio": 3,
        "Bloqueo carretera": 3, "Narcomenudeo": 2, "Incendio a bancos": 2
    };

    // TRADUCTOR AUTOMÁTICO: Convierte coordenadas con grados (22°45'10.0"N) a número decimal puro
    function convertirGradosADecimal(coorStr) {
        if (!coorStr) return NaN;
        const stringLimpio = coorStr.trim().toUpperCase();
        const matches = stringLimpio.match(/(\d+)°(\d+)'([\d.]+)"([NSEW])/);
        
        if (!matches) {
            const numeroDirecto = parseFloat(stringLimpio);
            return isNaN(numeroDirecto) ? NaN : numeroDirecto;
        }

        const grados = parseFloat(matches[1]);
        const minutos = parseFloat(matches[2]);
        const segundos = parseFloat(matches[3]);
        const direccion = matches[4];

        let decimal = grados + (minutos / 60) + (segundos / 3600);
        if (direccion === "S" || direccion === "W") {
            decimal = decimal * -1;
        }
        return decimal;
    }

    function initMap() {
        map = L.map('map', {
            center: MAP_CONFIG.center, zoom: MAP_CONFIG.zoom, minZoom: MAP_CONFIG.minZoom,
            maxZoom: MAP_CONFIG.maxZoom, maxBounds: MAP_CONFIG.bounds, maxBoundsViscosity: 1.0
        });
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { attribution: '&copy; CARTO' }).addTo(map);
        markerClusterGroup = L.markerClusterGroup().addTo(map);
        heatmapLayer = L.heatLayer([], { radius: 25, blur: 15, maxZoom: 12 }).addTo(map);

        document.getElementById('layer-cluster').addEventListener('change', e => e.target.checked ? map.addLayer(markerClusterGroup) : map.removeLayer(markerClusterGroup));
        document.getElementById('layer-heatmap').addEventListener('change', e => e.target.checked ? map.addLayer(heatmapLayer) : map.removeLayer(heatmapLayer));
    }

    function fetchIntelligenceData() {
        Papa.parse(SHEET_URL, {
            download: true, header: true, skipEmptyLines: true,
            complete: function(results) {
                if(results.data.length === 0) return;
                
                const keys = Object.keys(results.data[0]);
                const findKey = (alias) => keys.find(k => k.toLowerCase().replace(/\s/g, '').includes(alias.toLowerCase())) || "";

                const keyMunicipio = findKey("municipio");
                const keyLat = findKey("latitud");
                const keyLng = findKey("longitud");
                const keyIncidencia = findKey("incidencia") || findKey("incidente");
                const keyFecha = findKey("fecha") || keys[0]; 

                rawEventsData = results.data.map((row, idx) => {
                    let munRaw = row[keyMunicipio] ? row[keyMunicipio].trim() : "Guadalupe";
                    let municipioNombre = munRaw.charAt(0).toUpperCase() + munRaw.slice(1);

                    // Pasa las coordenadas por el traductor de grados a decimal
                    let lat = convertirGradosADecimal(row[keyLat]);
                    let lng = convertirGradosADecimal(row[keyLng]);

                    let fechaOriginal = row[keyFecha] || new Date().toISOString().split('T')[0];
                    let fechaLimpia = fechaOriginal.split(" ")[0];

                    return {
                        id: `OP-${2000 + idx}`,
                        fecha: fechaLimpia,
                        municipio: municipioNombre,
                        lat: lat,
                        lng: lng,
                        tipo: row[keyIncidencia] ? row[keyIncidencia].trim() : "Agresión armada"
                    };
                });

                populateFilters();
                processPipeline();
                document.getElementById('loader').classList.add('hidden');
            }
        });
    }

    function populateFilters() {
        const muns = [...new Set(rawEventsData.map(e => e.municipio))].sort();
        const select = document.getElementById('filter-municipio');
        select.innerHTML = '<option value="ALL">Todos los Municipios</option>';
        muns.forEach(m => { if(m) { const opt = document.createElement('option'); opt.value = m; opt.innerText = m; select.appendChild(opt); } });
        select.addEventListener('change', processPipeline);
        document.getElementById('filter-incidente').addEventListener('change', processPipeline);
    }

    function processPipeline() {
        const selectedMun = document.getElementById('filter-municipio').value;
        const selectedTipo = document.getElementById('filter-incidente').value;

        const filteredData = rawEventsData.filter(e => {
            const matchMun = (selectedMun === "ALL" || e.municipio === selectedMun);
            const matchTipo = (selectedTipo === "ALL" || e.tipo === selectedTipo);
            return matchMun && matchTipo;
        });

        updateMapLayers(filteredData);
        const iipsScore = calculateIIPS(filteredData);
        updateDashboardKPIs(filteredData, iipsScore);
        renderCharts(filteredData);
        executePredictiveAnalysis(filteredData, iipsScore);
    }

    function updateMapLayers(data) {
        markerClusterGroup.clearLayers();
        const heatPoints = [];

        data.forEach(e => {
            if (!isNaN(e.lat) && !isNaN(e.lng)) {
                heatPoints.push([e.lat, e.lng, 0.7]);
                
                const marker = L.circleMarker([e.lat, e.lng], {
                    radius: 6, fillColor: "#dc2626", color: "#ffffff", weight: 1, opacity: 0.8, fillOpacity: 0.9
                });

                // DISEÑO EXCLUSIVO EXIGIDO: Oculta noticias, enlaces y palabras clave. Solo info esencial.
                const popupContent = `
                    <div class="space-y-1 font-mono text-[11px]">
                        <div class="text-red-500 font-bold border-b border-neutral-700 pb-0.5 uppercase tracking-wide text-[9px]">REGISTRO VECTORIAL</div>
                        <div><strong>MUNICIPIO:</strong> ${e.municipio}</div>
                        <div><strong>INCIDENCIA:</strong> <span class="text-yellow-400 font-bold">${e.tipo}</span></div>
                        <div class="text-[9px] text-neutral-400 border-t border-neutral-800 pt-1 mt-1">
                            <strong>LAT:</strong> ${e.lat.toFixed(4)}<br>
                            <strong>LNG:</strong> ${e.lng.toFixed(4)}
                        </div>
                    </div>
                `;
                marker.bindPopup(popupContent);
                markerClusterGroup.addLayer(marker);
            }
        });
        heatmapLayer.setLatLngs(heatPoints);
    }

    function calculateIIPS(data) {
        let scoreTotal = 0;
        data.forEach(e => { scoreTotal += (1 * (PESOS_IIPS[e.tipo] || 1)); });
        return scoreTotal;
    }

    function getIIPSStatus(score) {
        if (score <= 40) return { label: "Estabilidad Relativa", color: "bg-emerald-500 text-neutral-950" };
        if (score <= 60) return { label: "Riesgo Controlado", color: "bg-yellow-500 text-neutral-950" };
        if (score <= 80) return { label: "Incremento Sostenido", color: "bg-orange-500 text-neutral-950" };
        return { label: "Alta Desestabilización", color: "bg-red-600 text-white" };
    }

    function updateDashboardKPIs(data, iips) {
        document.getElementById('kpi-total').innerText = data.length;
        const badge = document.getElementById('kpi-iips-badge');
        const status = getIIPSStatus(iips);
        badge.innerText = `${iips} pts - ${status.label}`;
        badge.className = `text-[11px] font-bold block mt-1 px-1.5 py-0.5 rounded text-center uppercase font-mono ${status.color}`;

        const counts = {};
        let maxMun = "Ninguno", maxCount = 0;
        data.forEach(e => {
            counts[e.municipio] = (counts[e.municipio] || 0) + 1;
            if (counts[e.municipio] > maxCount) { maxCount = counts[e.municipio]; maxMun = e.municipio; }
        });
        document.getElementById('kpi-municipio').innerText = maxCount > 0 ? `${maxMun} (${maxCount} ev)` : "Ninguno";
    }

    function renderCharts(data) {
        const ctx = document.getElementById('chart-incidencia').getContext('2d');
        const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
        const conteosMensuales = Array(12).fill(0);

        data.forEach(e => {
            if(e.fecha) {
                const parts = e.fecha.split("-");
                if(parts.length >= 2) {
                    const mesIndex = parseInt(parts[1]) - 1;
                    if(!isNaN(mesIndex) && mesIndex >= 0 && mesIndex < 12) conteosMensuales[mesIndex]++;
                }
            }
        });

        if (chartInstance) chartInstance.destroy();
        chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: meses,
                datasets: [{
                    label: 'Incidencia', data: conteosMensuales, borderColor: '#eab308',
                    backgroundColor: 'rgba(234, 179, 8, 0.05)', borderWidth: 2, tension: 0.3, fill: true
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { ticks: { color: '#a3a3a3', font: { size: 9, family: 'monospace' } }, grid: { color: '#262626' } },
                    y: { ticks: { color: '#a3a3a3', font: { size: 9, family: 'monospace' } }, grid: { color: '#262626' }, beginAtZero: true }
                }
            }
        });
    }

    function executePredictiveAnalysis(data, iipsScore) {
        const pText = document.getElementById('predictive-text');
        if (data.length === 0) { pText.innerText = "Información geoespacial insuficiente."; return; }
        const status = getIIPSStatus(iipsScore);
        let analisis = `El territorio evalúa un escenario de '${status.label.toUpperCase()}'. `;
        analisis += iipsScore > 70 ? "La concentración espacial advierte dinámicas complejas." : "El volumen de incidentes se localiza estable en nodos históricos.";
        pText.innerText = analisis;
    }

    initMap();
    fetchIntelligenceData();
});
