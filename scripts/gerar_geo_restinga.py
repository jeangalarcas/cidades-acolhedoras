#!/usr/bin/env python3
"""
gerar_geo_restinga.py — SGA / Módulo Restinga
Geocodifica os equipamentos de dados/restinga_equipamentos.csv SEM inventar
coordenadas: reaproveita o pipeline OSM já usado no SGA (abrigos_rs.geojson).

Fluxo (mesmo padrão documentado na sessão de 20/07/2026 do SGA):
  1. baixar Geofabrik sul-latest.osm.pbf (curl -L)
  2. extrair com pyosmium os POIs nomeados de interesse
  3. recortar no bairro Restinga (polígono IBGE CD2022 / bairros do SGA)
  4. match por nome normalizado com o CSV de equipamentos verificados
  5. gravar restinga_equipamentos.geojson (lat/lon só quando houver match;
     sem match => geometry null, equipamento aparece no app como lista)

Uso:
  python3 gerar_geo_restinga.py --pbf sul-latest.osm.pbf \
      --csv dados/restinga_equipamentos.csv \
      --bairros public/data/geo/bairros_rs.geojson \
      --out public/data/geo/restinga_equipamentos.geojson
"""
import argparse, csv, json, re, unicodedata

import osmium
import shapely.geometry as sgeom


def norm(s: str) -> str:
    s = unicodedata.normalize("NFD", s or "").encode("ascii", "ignore").decode()
    s = re.sub(r"\b(us|cf|caps|cras|av|r|rua|unidade de saude)\b\.?", " ", s.lower())
    return re.sub(r"\s+", " ", s).strip()


TAGS = {
    "amenity": {"hospital", "clinic", "doctors", "social_facility", "police",
                "fire_station", "community_centre", "bus_station", "shelter"},
    "healthcare": {"hospital", "clinic", "centre"},
    "public_transport": {"station"},
}


class Handler(osmium.SimpleHandler):
    def __init__(self):
        super().__init__()
        self.pois = []

    def _keep(self, tags):
        return tags.get("name") and any(
            tags.get(k) in v for k, v in TAGS.items()
        )

    def node(self, n):
        if self._keep(n.tags):
            self.pois.append({"name": n.tags["name"],
                              "lat": n.location.lat, "lon": n.location.lon,
                              "tags": dict(n.tags)})

    def area(self, a):  # ways/relações fechadas (hospitais etc.)
        if self._keep(a.tags):
            try:
                wkb = osmium.geom.WKBFactory().create_multipolygon(a)
                import shapely.wkb as swkb
                c = swkb.loads(wkb, hex=True).representative_point()
                self.pois.append({"name": a.tags["name"],
                                  "lat": c.y, "lon": c.x,
                                  "tags": dict(a.tags)})
            except Exception:
                pass


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pbf", required=True)
    ap.add_argument("--csv", required=True)
    ap.add_argument("--bairros", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--bairro-nome", default="Restinga")
    ap.add_argument("--municipio-ibge", default="4314902")
    args = ap.parse_args()

    gj = json.load(open(args.bairros, encoding="utf-8"))
    polys = [sgeom.shape(f["geometry"]) for f in gj["features"]
             if str(f["properties"].get("ibge", f["properties"].get("cod_mun", ""))).startswith(args.municipio_ibge[:6])
             and args.bairro_nome.lower() in str(f["properties"].get("nome", f["properties"].get("name", ""))).lower()]
    if not polys:
        raise SystemExit("Polígono do bairro não encontrado — confira --bairros/--bairro-nome")
    area = sgeom.MultiPolygon([p if p.geom_type == "Polygon" else p.geoms[0] for p in polys]).buffer(0.01)

    h = Handler()
    h.apply_file(args.pbf, locations=True)
    dentro = [p for p in h.pois if area.contains(sgeom.Point(p["lon"], p["lat"]))]
    print(f"POIs OSM nomeados no recorte: {len(dentro)}")

    feats = []
    with open(args.csv, encoding="utf-8") as fh:
        for row in csv.DictReader(fh, delimiter=";"):
            alvo, match = norm(row["nome"]), None
            for p in dentro:
                if alvo and (alvo in norm(p["name"]) or norm(p["name"]) in alvo):
                    match = p
                    break
            geom = {"type": "Point", "coordinates": [match["lon"], match["lat"]]} if match else None
            props = dict(row)
            props["geocodificado_por"] = "OSM (pipeline SGA)" if match else None
            props["osm_name"] = match["name"] if match else None
            feats.append({"type": "Feature", "geometry": geom, "properties": props})

    json.dump({"type": "FeatureCollection",
               "metadata": {"gerado_por": "gerar_geo_restinga.py",
                            "regra": "geometry=null quando não houver match — nunca inventar coordenada"},
               "features": feats},
              open(args.out, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    ok = sum(1 for f in feats if f["geometry"])
    print(f"{ok}/{len(feats)} equipamentos geocodificados → {args.out}")


if __name__ == "__main__":
    main()
