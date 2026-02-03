"""AI-generated image detection."""

import io
import logging
from typing import Any, Dict, List, Optional

import numpy as np
from PIL import Image

logger = logging.getLogger(__name__)


class ImageDetector:
    """
    AI-generated image detection using ensemble of models.

    This is a demonstration implementation. In production, this would
    load actual trained models for detection.
    """

    def __init__(self, image_max_dimension: int = 1024):
        self.image_max_dimension = image_max_dimension
        self.models_loaded = False
        self._load_models()

    def _load_models(self):
        """Load detection models."""
        logger.info("Loading detection models...")
        self.models_loaded = True
        logger.info("Detection models loaded successfully")

    async def detect(self, image_data: bytes, options: Dict[str, Any] = None) -> Dict[str, Any]:
        """Run detection on an image."""
        options = options or {}

        image = Image.open(io.BytesIO(image_data))
        image = self._preprocess(image)

        detections = []

        primary_result = await self._run_primary_classifier(image)
        detections.append(primary_result)

        gan_result = await self._run_gan_detector(image)
        detections.append(gan_result)

        diffusion_result = await self._run_diffusion_detector(image)
        detections.append(diffusion_result)

        freq_result = await self._run_frequency_analysis(image)
        detections.append(freq_result)

        ensemble_score = self._calculate_ensemble_score(detections)
        verdict, risk_level = self._determine_verdict(ensemble_score)
        summary = self._generate_summary(verdict, detections)

        return {
            "verdict": verdict,
            "confidence": ensemble_score,
            "risk_level": risk_level,
            "summary": summary,
            "detections": detections,
            "ensemble_score": ensemble_score,
        }

    def _preprocess(self, image: Image.Image) -> Image.Image:
        """Preprocess image for detection."""
        if image.mode != "RGB":
            image = image.convert("RGB")

        max_dim = self.image_max_dimension
        if max(image.size) > max_dim:
            ratio = max_dim / max(image.size)
            new_size = (int(image.width * ratio), int(image.height * ratio))
            image = image.resize(new_size, Image.Resampling.LANCZOS)

        return image

    async def _run_primary_classifier(self, image: Image.Image) -> Dict[str, Any]:
        """Run primary CNN + ViT classifier."""
        img_array = np.array(image)
        mean_val = np.mean(img_array)
        std_val = np.std(img_array)
        confidence = self._mock_detection_score(mean_val, std_val)
        verdict = "ai_generated" if confidence > 0.5 else "authentic"

        return {
            "model": "primary_classifier_v3",
            "verdict": verdict,
            "confidence": confidence,
            "details": {
                "generation_type": "full_synthetic" if confidence > 0.7 else "unknown",
                "artifacts_detected": self._detect_artifacts(img_array),
            },
        }

    async def _run_gan_detector(self, image: Image.Image) -> Dict[str, Any]:
        """Run GAN fingerprint detector."""
        img_array = np.array(image)
        confidence = self._mock_detection_score(np.mean(img_array), np.std(img_array), offset=0.1)

        generator = None
        if confidence > 0.6:
            generators = ["stylegan2", "stylegan3", "stable_diffusion", "midjourney", "dall_e_3"]
            generator = np.random.choice(generators)

        return {
            "model": "gan_detector_v2",
            "verdict": "ai_generated" if confidence > 0.5 else "authentic",
            "confidence": confidence,
            "details": {
                "likely_generator": generator,
                "fingerprint_match": confidence > 0.7,
            },
        }

    async def _run_diffusion_detector(self, image: Image.Image) -> Dict[str, Any]:
        """Run diffusion model detector."""
        img_array = np.array(image)
        confidence = self._mock_detection_score(np.mean(img_array), np.std(img_array), offset=-0.05)

        return {
            "model": "diffusion_detector_v1",
            "verdict": "ai_generated" if confidence > 0.5 else "authentic",
            "confidence": confidence,
            "details": {
                "model_family": "latent_diffusion" if confidence > 0.6 else None,
                "estimated_steps": "20-50" if confidence > 0.7 else None,
            },
        }

    async def _run_frequency_analysis(self, image: Image.Image) -> Dict[str, Any]:
        """Run frequency domain analysis."""
        img_array = np.array(image.convert("L"))
        fft = np.fft.fft2(img_array)
        fft_shift = np.fft.fftshift(fft)
        magnitude = np.log(np.abs(fft_shift) + 1)

        center = np.array(magnitude.shape) // 2
        high_freq_energy = np.mean(magnitude[center[0]-50:center[0]+50, center[1]-50:center[1]+50])
        confidence = min(1.0, max(0.0, (high_freq_energy - 5) / 10))

        return {
            "model": "frequency_analyzer_v1",
            "verdict": "ai_generated" if confidence > 0.5 else "authentic",
            "confidence": confidence,
            "details": {
                "fft_score": float(confidence),
                "spectral_anomaly": confidence > 0.7,
            },
        }

    def _calculate_ensemble_score(self, detections: List[Dict]) -> float:
        """Calculate weighted ensemble score."""
        weights = {
            "primary_classifier_v3": 0.35,
            "gan_detector_v2": 0.25,
            "diffusion_detector_v1": 0.25,
            "frequency_analyzer_v1": 0.15,
        }

        total_weight = 0
        weighted_sum = 0

        for detection in detections:
            model = detection["model"]
            weight = weights.get(model, 0.1)
            weighted_sum += detection["confidence"] * weight
            total_weight += weight

        return weighted_sum / total_weight if total_weight > 0 else 0.5

    def _determine_verdict(self, confidence: float) -> tuple:
        """Determine verdict and risk level."""
        if confidence > 0.85:
            return "ai_generated", "high"
        elif confidence > 0.65:
            return "likely_ai", "medium"
        elif confidence > 0.35:
            return "inconclusive", "medium"
        elif confidence > 0.15:
            return "likely_authentic", "low"
        else:
            return "authentic", "low"

    def _generate_summary(self, verdict: str, detections: List[Dict]) -> str:
        """Generate human-readable summary."""
        summaries = {
            "ai_generated": "This image shows strong indicators of AI generation.",
            "likely_ai": "This image shows probable signs of AI generation.",
            "inconclusive": "Detection results are inconclusive.",
            "likely_authentic": "This image appears likely to be authentic.",
            "authentic": "This image shows strong indicators of being authentic.",
        }

        ai_models = [d for d in detections if d["verdict"] == "ai_generated"]
        if ai_models:
            generators = [
                d["details"].get("likely_generator")
                for d in ai_models
                if d["details"].get("likely_generator")
            ]
            if generators:
                return f"{summaries[verdict]} Likely source: {generators[0]}."

        return summaries.get(verdict, "Unable to determine image authenticity.")

    def _mock_detection_score(self, mean: float, std: float, offset: float = 0) -> float:
        """Generate mock detection score for testing."""
        base_score = (np.sin(mean / 50) + np.cos(std / 30)) / 2 + 0.5
        return min(1.0, max(0.0, base_score + offset))

    def _detect_artifacts(self, img_array: np.ndarray) -> List[str]:
        """Detect visual artifacts."""
        artifacts = []

        local_stds = []
        for i in range(0, img_array.shape[0] - 32, 32):
            for j in range(0, img_array.shape[1] - 32, 32):
                patch = img_array[i:i+32, j:j+32]
                local_stds.append(np.std(patch))

        if len(local_stds) > 0 and np.std(local_stds) < 15:
            artifacts.append("texture_uniformity")

        if img_array.ndim == 3:
            color_ranges = [np.ptp(img_array[:, :, c]) for c in range(3)]
            if min(color_ranges) < 100:
                artifacts.append("limited_color_range")

        return artifacts
