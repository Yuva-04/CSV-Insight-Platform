from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd

from app.storage import save_csv, load_csv


# ============================================================
# FASTAPI APPLICATION
# ============================================================

app = FastAPI(
    title="CSV Analytics API",
    description="API for uploading, analyzing, and checking the quality of CSV datasets",
    version="3.2.0"
)


# ============================================================
# CORS CONFIGURATION
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# V1 - HOME
# ============================================================

@app.get("/")
def home():
    return {
        "message": "Welcome to CSV Analytics API",
        "version": "3.2.0"
    }


# ============================================================
# V1 - UPLOAD CSV
# ============================================================

@app.post("/upload")
async def upload_csv(file: UploadFile = File(...)):

    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(
            status_code=400,
            detail="Only CSV files are allowed"
        )

    try:

        df = pd.read_csv(file.file)

        if df.empty:
            raise HTTPException(
                status_code=400,
                detail="The CSV file is empty"
            )

        file_id = save_csv(df)

        return {
            "message": "CSV uploaded successfully",
            "file_id": file_id,
            "filename": file.filename,
            "rows": len(df),
            "columns": len(df.columns),
            "column_names": df.columns.tolist()
        }

    except pd.errors.EmptyDataError:

        raise HTTPException(
            status_code=400,
            detail="The CSV file is empty"
        )

    except HTTPException:
        raise

    except Exception as e:

        raise HTTPException(
            status_code=400,
            detail=f"Could not process CSV file: {str(e)}"
        )


# ============================================================
# V1 - DATASET SUMMARY
# ============================================================

@app.get("/summary/{file_id}")
def get_summary(file_id: str):

    try:
        df = load_csv(file_id)

    except FileNotFoundError:

        raise HTTPException(
            status_code=404,
            detail="CSV file not found"
        )

    numeric_columns = df.select_dtypes(
        include="number"
    ).columns.tolist()

    categorical_columns = df.select_dtypes(
        include=["object", "category"]
    ).columns.tolist()

    boolean_columns = df.select_dtypes(
        include="bool"
    ).columns.tolist()

    datetime_columns = df.select_dtypes(
        include="datetime"
    ).columns.tolist()

    return {
        "file_id": file_id,
        "rows": len(df),
        "columns": len(df.columns),
        "column_names": df.columns.tolist(),
        "numeric_columns": numeric_columns,
        "categorical_columns": categorical_columns,
        "boolean_columns": boolean_columns,
        "datetime_columns": datetime_columns
    }


# ============================================================
# V2 - NUMERIC STATISTICS
# ============================================================

@app.get("/analytics/statistics/{file_id}")
def statistics(file_id: str):

    try:
        df = load_csv(file_id)

    except FileNotFoundError:

        raise HTTPException(
            status_code=404,
            detail="CSV file not found"
        )

    numeric_df = df.select_dtypes(
        include="number"
    )

    if numeric_df.empty:

        raise HTTPException(
            status_code=400,
            detail="No numeric columns found in the dataset"
        )

    stats = numeric_df.describe()

    return {
        "file_id": file_id,
        "numeric_statistics": stats.to_dict()
    }


# ============================================================
# V2 - COLUMN ANALYSIS
# ============================================================

@app.get("/analytics/columns/{file_id}")
def column_analysis(file_id: str):

    try:
        df = load_csv(file_id)

    except FileNotFoundError:

        raise HTTPException(
            status_code=404,
            detail="CSV file not found"
        )

    result = {}

    for column in df.columns:

        data = df[column]

        result[column] = {
            "data_type": str(data.dtype),
            "unique_values": int(data.nunique()),
            "missing_values": int(data.isnull().sum())
        }

    return {
        "file_id": file_id,
        "columns": result
    }


# ============================================================
# V2 - CATEGORICAL ANALYSIS
# ============================================================

@app.get("/analytics/categorical/{file_id}")
def categorical_analysis(file_id: str):

    try:
        df = load_csv(file_id)

    except FileNotFoundError:

        raise HTTPException(
            status_code=404,
            detail="CSV file not found"
        )

    categorical_columns = df.select_dtypes(
        include=["object", "category"]
    ).columns

    if len(categorical_columns) == 0:

        raise HTTPException(
            status_code=400,
            detail="No categorical columns found in the dataset"
        )

    result = {}

    for column in categorical_columns:

        value_counts = df[column].value_counts(
            dropna=False
        ).head(10)

        result[column] = {
            str(key): int(value)
            for key, value in value_counts.items()
        }

    return {
        "file_id": file_id,
        "categorical_analysis": result
    }


# ============================================================
# V2 - CORRELATION
# ============================================================

@app.get("/analytics/correlation/{file_id}")
def correlation_analysis(file_id: str):

    try:
        df = load_csv(file_id)

    except FileNotFoundError:

        raise HTTPException(
            status_code=404,
            detail="CSV file not found"
        )

    numeric_df = df.select_dtypes(
        include="number"
    )

    if numeric_df.shape[1] < 2:

        raise HTTPException(
            status_code=400,
            detail="At least two numeric columns are required for correlation analysis"
        )

    correlation = numeric_df.corr()

    return {
        "file_id": file_id,
        "correlation": correlation.to_dict()
    }


# ============================================================
# V2 - DATE ANALYSIS
# ============================================================

@app.get("/analytics/dates/{file_id}")
def date_analysis(file_id: str):

    try:
        df = load_csv(file_id)

    except FileNotFoundError:

        raise HTTPException(
            status_code=404,
            detail="CSV file not found"
        )

    date_columns = []

    for column in df.columns:

        converted = pd.to_datetime(
            df[column],
            errors="coerce"
        )

        valid_dates = converted.notna().sum()

        non_empty = df[column].notna().sum()

        if non_empty > 0 and valid_dates / non_empty >= 0.8:

            date_columns.append(column)

    if len(date_columns) == 0:

        return {
            "file_id": file_id,
            "message": "No date columns detected"
        }

    result = {}

    for column in date_columns:

        dates = pd.to_datetime(
            df[column],
            errors="coerce"
        )

        result[column] = {
            "minimum_date": str(dates.min()),
            "maximum_date": str(dates.max())
        }

    return {
        "file_id": file_id,
        "date_analysis": result
    }


# ============================================================
# V3 - DATA QUALITY REPORT
# ============================================================

@app.get("/quality/report/{file_id}")
def quality_report(file_id: str):

    try:
        df = load_csv(file_id)

    except FileNotFoundError:

        raise HTTPException(
            status_code=404,
            detail="CSV file not found"
        )

    # --------------------------------------------------------
    # Missing values
    # --------------------------------------------------------

    missing_values = df.isnull().sum()

    missing_values = {
        str(column): int(count)
        for column, count in missing_values.items()
        if count > 0
    }

    total_missing_values = int(
        df.isnull().sum().sum()
    )

    # --------------------------------------------------------
    # Duplicate rows
    # --------------------------------------------------------

    duplicate_rows = int(
        df.duplicated().sum()
    )

    # --------------------------------------------------------
    # Numeric columns
    # --------------------------------------------------------

    numeric_columns = df.select_dtypes(
        include="number"
    ).columns.tolist()

    # --------------------------------------------------------
    # Categorical columns
    # --------------------------------------------------------

    categorical_columns = df.select_dtypes(
        include=["object", "category"]
    ).columns.tolist()

    # --------------------------------------------------------
    # Negative values
    # --------------------------------------------------------

    negative_values = {}

    for column in numeric_columns:

        negative_count = int(
            (df[column] < 0).sum()
        )

        if negative_count > 0:

            negative_values[column] = negative_count

    # --------------------------------------------------------
    # Date analysis
    # --------------------------------------------------------

    date_analysis = {}

    total_invalid_dates = 0

    for column in df.columns:

        converted = pd.to_datetime(
            df[column],
            errors="coerce"
        )

        non_empty = df[column].notna().sum()

        if non_empty > 0:

            valid_dates = converted.notna().sum()

            if valid_dates / non_empty >= 0.8:

                invalid_dates = int(
                    non_empty - valid_dates
                )

                total_invalid_dates += invalid_dates

                date_analysis[column] = {
                    "invalid_dates": invalid_dates
                }

    # --------------------------------------------------------
    # Quality score
    # --------------------------------------------------------

    score = 100

    if total_missing_values > 0:
        score -= 20

    if duplicate_rows > 0:
        score -= 15

    if total_invalid_dates > 0:
        score -= 15

    if len(negative_values) > 0:
        score -= 10

    score = max(score, 0)

    # --------------------------------------------------------
    # Quality status
    # --------------------------------------------------------

    if score >= 90:

        quality_status = "Excellent"

    elif score >= 75:

        quality_status = "Good"

    elif score >= 50:

        quality_status = "Needs Improvement"

    else:

        quality_status = "Poor"

    # --------------------------------------------------------
    # Final response
    # --------------------------------------------------------

    return {
        "file_id": file_id,
        "total_rows": len(df),
        "total_columns": len(df.columns),
        "missing_values": missing_values,
        "total_missing_values": total_missing_values,
        "duplicate_rows": duplicate_rows,
        "numeric_columns": numeric_columns,
        "categorical_columns": categorical_columns,
        "negative_values": negative_values,
        "date_analysis": date_analysis,
        "invalid_dates": total_invalid_dates,
        "data_quality_score": score,
        "quality_status": quality_status
    }