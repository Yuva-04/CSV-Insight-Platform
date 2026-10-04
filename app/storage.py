from pathlib import Path
import uuid
import pandas as pd


# ============================================================
# STORAGE CONFIGURATION
# ============================================================

UPLOAD_DIR = Path("data/uploads")

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


# ============================================================
# SAVE CSV
# ============================================================

def save_csv(df: pd.DataFrame) -> str:
    """
    Save a DataFrame as a CSV file and return a unique file_id.
    """

    file_id = str(uuid.uuid4())

    file_path = UPLOAD_DIR / f"{file_id}.csv"

    df.to_csv(file_path, index=False)

    return file_id


# ============================================================
# GET FILE PATH
# ============================================================

def get_file_path(file_id: str) -> Path:
    """
    Return the path of a stored CSV file.
    """

    file_path = UPLOAD_DIR / f"{file_id}.csv"

    if not file_path.exists():
        raise FileNotFoundError(
            f"CSV file with ID '{file_id}' was not found"
        )

    return file_path


# ============================================================
# LOAD CSV
# ============================================================

def load_csv(file_id: str) -> pd.DataFrame:
    """
    Load a stored CSV file using its file_id.
    """

    file_path = get_file_path(file_id)

    return pd.read_csv(file_path)


# ============================================================
# DELETE CSV
# ============================================================

def delete_csv(file_id: str) -> bool:
    """
    Delete a stored CSV file.
    """

    file_path = get_file_path(file_id)

    file_path.unlink()

    return True