from contextlib import asynccontextmanager
from typing import List
import logging

import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("credit-risk-api")

# Global pipeline container
ml_artifacts = {}

MODEL_PATH = "credit_risk.pkl"
THRESHOLD_PATH = "best_threshold.pkl"

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load the scikit-learn pipeline and threshold on startup."""
    logger.info("Loading model pipeline from %s...", MODEL_PATH)
    try:
        # Replaced standard pickle with joblib for correct scikit-learn deserialization
        ml_artifacts["pipeline"] = joblib.load(MODEL_PATH)
        logger.info("Model pipeline loaded successfully.")
    except Exception as exc:
        logger.error("Failed to load model: %s", exc)
        raise RuntimeError(f"Could not load model from {MODEL_PATH}") from exc

    try:
        ml_artifacts["threshold"] = round(float(joblib.load(THRESHOLD_PATH)), 4)
        logger.info("Optimal threshold loaded: %s", ml_artifacts["threshold"])
    except Exception as exc:
        logger.warning("Threshold file not found. Defaulting to 0.50. Error: %s", exc)
        ml_artifacts["threshold"] = 0.50

    yield
    ml_artifacts.clear()
    logger.info("Model pipeline unloaded.")

app = FastAPI(
    title="Credit Risk Prediction API",
    description="Predicts the probability of loan default based on applicant features.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class LoanInput(BaseModel):
    person_age: float = Field(..., example=28, description="Age of the applicant")
    person_income: float = Field(..., example=55000, description="Annual income")
    person_home_ownership: str = Field(
        ..., 
        example="RENT", 
        description="Home ownership: MORTGAGE, OTHER, OWN, RENT"
    )
    person_emp_length: float = Field(..., example=3.0, description="Employment length in years")
    loan_intent: str = Field(
        ..., 
        example="PERSONAL", 
        description="Purpose: DEBTCONSOLIDATION, EDUCATION, HOMEIMPROVEMENT, MEDICAL, PERSONAL, VENTURE"
    )
    loan_grade: str = Field(
        ..., 
        example="B", 
        description="Loan grade: A, B, C, D, E, F, G"
    )
    loan_amnt: float = Field(..., example=10000, description="Loan amount requested")
    loan_int_rate: float = Field(..., example=10.5, description="Interest rate of the loan")
    loan_percent_income: float = Field(
        ..., 
        example=0.18, 
        description="Loan amount as a percentage of income (e.g., 0.18 for 18%)"
    )
    cb_person_default_on_file: str = Field(
        ..., 
        example="N", 
        description="Historical default on file: Y or N"
    )
    cb_person_cred_hist_length: float = Field(
        ..., 
        example=4, 
        description="Credit history length in years"
    )

class PredictionOutput(BaseModel):
    prediction: int
    probability_default: float
    threshold: float
    decision: str

class BatchPredictionOutput(BaseModel):
    predictions: List[PredictionOutput]

@app.get("/health", status_code=status.HTTP_200_OK, tags=["Health"])
def health_check():
    """Health check endpoint to verify model readiness."""
    is_ready = "pipeline" in ml_artifacts
    return {
        "status": "ok" if is_ready else "error",
        "model_loaded": is_ready,
        "threshold": ml_artifacts.get("threshold", 0.50)
    }

@app.post("/predict", response_model=PredictionOutput, tags=["Inference"])
def predict_single(loan: LoanInput):
    """Predict default probability for a single loan application."""
    pipeline = ml_artifacts.get("pipeline")
    threshold = ml_artifacts.get("threshold", 0.50)

    if pipeline is None:
        raise HTTPException(status_code=503, detail="Model is not ready.")

    try:
        df = pd.DataFrame([loan.model_dump()])
        prob_matrix = pipeline.predict_proba(df)[0]
        prob_default = round(float(prob_matrix[1]), 4)
        
        is_default = int(prob_default >= threshold)

        return PredictionOutput(
            prediction=is_default,
            probability_default=prob_default,
            threshold=threshold,
            decision="Default" if is_default == 1 else "Repaid"
        )
    except Exception as exc:
        logger.error("Inference failure: %s", exc)
        raise HTTPException(status_code=400, detail=f"Inference error: {str(exc)}")

@app.post("/predict/batch", response_model=BatchPredictionOutput, tags=["Inference"])
def predict_batch(loans: List[LoanInput]):
    """Batch inference endpoint for high-throughput scoring."""
    pipeline = ml_artifacts.get("pipeline")
    threshold = ml_artifacts.get("threshold", 0.50)

    if pipeline is None:
        raise HTTPException(status_code=503, detail="Model is not ready.")

    if not loans:
        raise HTTPException(status_code=400, detail="The input list cannot be empty.")

    try:
        df = pd.DataFrame([item.model_dump() for item in loans])
        probabilities_matrix = pipeline.predict_proba(df)

        results = []
        for probs in probabilities_matrix:
            prob_default = round(float(probs[1]), 4)
            is_default = int(prob_default >= threshold)
            results.append(
                PredictionOutput(
                    prediction=is_default,
                    probability_default=prob_default,
                    threshold=threshold,
                    decision="Default" if is_default == 1 else "Repaid"
                )
            )

        return BatchPredictionOutput(predictions=results)
    except Exception as exc:
        logger.error("Batch inference failure: %s", exc)
        raise HTTPException(status_code=400, detail=f"Batch inference error: {str(exc)}")