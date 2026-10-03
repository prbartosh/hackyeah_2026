"""Mapa Wyzwań Społecznych (single PDF) -> assets/mapa-wyzwan"""
from common import ASSETS, BASE
from publikacje import fetch
from common import write_json

OUT = ASSETS / "mapa-wyzwan"


def main():
    m = fetch(f"{BASE}/mpliki/IS/IWS_20/za._nr_2._Mapa_Wyzwa_Spoecznych.pdf", OUT,
              "Mapa Wyzwań Społecznych", {})
    write_json(OUT / "metadata.json", [m])
    print("ok", m["pages"], "pages")


if __name__ == "__main__":
    main()
