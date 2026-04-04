import sys
from pathlib import Path

# Serviço: pacote `src.*` + módulos `shared.*` (mesmo padrão do competitions-service).
_svc_root = Path(__file__).resolve().parent.parent
_src = Path(__file__).resolve().parent
for p in (_src, _svc_root):
    s = str(p)
    if s not in sys.path:
        sys.path.insert(0, s)

from src.core.app import create_app

app = create_app()

