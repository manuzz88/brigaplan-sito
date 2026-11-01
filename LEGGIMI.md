# brigaplan.ai

Sito di Brigaplan (pagine statiche) in italiano, inglese e cinese. Si genera dalla cartella `sito/pubblico/` del progetto BRIGAPLAN.

- **Si modifica solo l'italiano.** Le pagine `en/` e `zh/` le rifà `sito/strumenti/lingue.py`, con la memoria delle traduzioni in `sito/lingue/` (istruzioni in `sito/lingue/LEGGIMI.md`).
- **Pubblicazione:**
  1. copia qui solo i file pronti (non le bozze);
  2. commit e push;
  3. nuovo deploy dell'app su DigitalOcean App Platform (API `POST /v2/apps/<id>/deployments`).
