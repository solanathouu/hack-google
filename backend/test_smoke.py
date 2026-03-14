import os
from dotenv import load_dotenv

load_dotenv()


def test_gemini_connection():
    from google import genai

    api_key = os.getenv("GOOGLE_API_KEY")
    assert api_key and api_key != "your_key_here", "GOOGLE_API_KEY not set in .env"

    client = genai.Client(api_key=api_key)

    # Use gemini-2.0-flash — update MODEL_NAME if hackathon provides different model
    MODEL_NAME = "gemini-2.0-flash"

    response = client.models.generate_content(
        model=MODEL_NAME,
        contents="Reply with exactly: OK",
    )
    assert "OK" in response.text
    print(f"Gemini OK (model={MODEL_NAME}): {response.text.strip()}")


def test_gemini_function_calling_api():
    """Verify the SDK supports the function calling API we need."""
    from google.genai import types

    assert hasattr(types.Part, "from_function_response"), (
        "types.Part.from_function_response not found — SDK version may be incompatible. "
        "Try: pip install --upgrade google-genai"
    )
    print("Gemini SDK function calling API: OK")


def test_huggingface_model():
    import torch
    from sentence_transformers import CrossEncoder

    model = CrossEncoder(
        "cross-encoder/ms-marco-MiniLM-L6-v2",
        default_activation_function=torch.nn.Sigmoid(),
    )
    pairs = [("urgent action required deadline missed", "Le product owner attend les corrections avant lundi. C'est bloquant.")]
    scores = model.predict(pairs)
    score = float(scores[0])
    assert 0.0 <= score <= 1.0
    print(f"HuggingFace OK: score={score:.3f}")


if __name__ == "__main__":
    test_gemini_connection()
    test_gemini_function_calling_api()
    test_huggingface_model()
    print("\nAll smoke tests passed.")
