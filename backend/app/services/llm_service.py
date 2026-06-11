from typing import List, Dict, Generator
from app.config import Config


class LLMService:
    def __init__(self, api_key: str = None, provider: str = None):
        self.provider = provider or Config.LLM_PROVIDER
        self.model = None
        
        if self.provider == "grok":
            # Use Grok API via OpenAI-compatible interface
            try:
                from openai import OpenAI
                grok_key = api_key or Config.GROK_API_KEY
                if grok_key:
                    self.client = OpenAI(
                        api_key=grok_key,
                        base_url="https://api.x.ai/v1",
                    )
                    # Try multiple model names
                    self.model_names = ["grok-2", "grok-2-latest", "grok-beta", "grok"]
                    self.model = self.model_names[0]
                    print(f"✓ Grok client initialized. Will try models: {self.model_names}")
                else:
                    self.client = None
                    print("⚠ Grok API key not configured")
            except ImportError:
                print("⚠ OpenAI library not installed. Install with: pip install openai")
                self.client = None
        else:
            # Use Gemini API
            try:
                import google.generativeai as genai
                gemini_key = api_key or Config.GEMINI_API_KEY
                if gemini_key:
                    genai.configure(api_key=gemini_key)
                    self.model = genai.GenerativeModel("gemini-2.5-flash")
                    print("✓ Using Gemini API")
                else:
                    self.model = None
                    print("⚠ Gemini API key not configured")
            except ImportError:
                print("⚠ Google AI library not installed")
                self.model = None
            self.client = None

    def _get_request_config(self):
        from flask import request, has_request_context
        if has_request_context():
            req_api_key = request.headers.get("X-API-Key")
            req_model = request.headers.get("X-AI-Model")
            return req_api_key, req_model
        return None, None

    def is_available(self) -> bool:
        if self.provider == "grok":
            return self.client is not None and self.model is not None
        else:
            return self.model is not None

    def generate(self, prompt: str, stream: bool = False, override_api_key: str = None, override_model: str = None):
        req_api_key, req_model = self._get_request_config()
        final_api_key = override_api_key or req_api_key
        final_model = override_model or req_model
        
        if not final_model:
            final_model = "grok-2" if self.provider == "grok" else "gemini-2.5-flash"
        
        # If the user selected a gemini model
        if final_model and final_model.startswith("gemini"):
            try:
                import google.generativeai as genai
                gemini_key = final_api_key or Config.GEMINI_API_KEY
                if not gemini_key:
                    yield "Gemini API key is missing. Please configure it in Settings."
                    return
                
                genai.configure(api_key=gemini_key)
                model_name = final_model if final_model else "gemini-2.5-flash"
                dynamic_model = genai.GenerativeModel(model_name)
                
                if stream:
                    try:
                        response = dynamic_model.generate_content(prompt, stream=True)
                        for chunk in response:
                            if chunk.text:
                                yield chunk.text
                    except Exception:
                        response = dynamic_model.generate_content(prompt)
                        yield response.text
                else:
                    response = dynamic_model.generate_content(prompt)
                    yield response.text
                return
            except Exception as e:
                yield f"Error: {str(e)[:200]}. The retrieval system is working."
                return
                
        # If the user selected a grok model
        if final_model and final_model.startswith("grok"):
            try:
                from openai import OpenAI
                grok_key = final_api_key or Config.GROK_API_KEY
                if not grok_key:
                    yield "Grok API key is missing. Please configure it in Settings."
                    return
                
                dynamic_client = OpenAI(api_key=grok_key, base_url="https://api.x.ai/v1")
                if stream:
                    response = dynamic_client.chat.completions.create(
                        model=final_model,
                        messages=[{"role": "user", "content": prompt}],
                        stream=True,
                        temperature=0.7,
                    )
                    for chunk in response:
                        if chunk.choices[0].delta.content:
                            yield chunk.choices[0].delta.content
                else:
                    response = dynamic_client.chat.completions.create(
                        model=final_model,
                        messages=[{"role": "user", "content": prompt}],
                        temperature=0.7,
                    )
                    yield response.choices[0].message.content
                return
            except Exception as e:
                yield f"Grok API Error: {str(e)[:150]}. The retrieval system is working."
                return

        # Fallback to configured default
        if not self.is_available():
            yield from self._fallback_response(prompt)
            return

    def _fallback_response(self, prompt: str) -> Generator[str, None, None]:
        yield (
            "Gemini API key is not configured. Based on the retrieved context in your documents, "
            "please configure GEMINI_API_KEY in your environment to enable full AI reasoning capabilities. "
            "The retrieval system is working — relevant document chunks have been identified."
        )

    def summarize(self, text: str, summary_type: str = "executive", override_api_key: str = None, override_model: str = None) -> str:
        req_api_key, req_model = self._get_request_config()
        final_api_key = override_api_key or req_api_key
        if not final_api_key and not self.is_available():
            return "[Summarization requires valid API key]"
            
        prompts = {
            "executive": f"Provide a concise executive summary (3-5 sentences) of the following document:\n\n{text[:8000]}",
            "chapter": f"Provide a detailed chapter-by-chapter summary of the following document:\n\n{text[:8000]}",
            "bullet": f"Provide a bullet-point summary of the key findings from the following document:\n\n{text[:8000]}",
        }
        prompt = prompts.get(summary_type, prompts["executive"])
        result = ""
        try:
            for chunk in self.generate(prompt, stream=False, override_api_key=override_api_key, override_model=override_model):
                result += chunk
        except Exception as e:
            result = f"[Summary generation failed: {str(e)[:100]}]"
        return result

    def research_analysis(self, context: str, analysis_type: str) -> str:
        prompts = {
            "contradictions": f"Analyze the following documents and identify any contradictions or conflicting information:\n\n{context}",
            "trends": f"Analyze the following documents and identify key trends and patterns:\n\n{context}",
            "insights": f"Extract the most important insights and findings from the following documents:\n\n{context}",
            "compare": f"Compare and contrast the key points across the following documents:\n\n{context}",
            "findings": f"Highlight the most important findings across the following documents:\n\n{context}",
        }
        prompt = prompts.get(analysis_type, prompts["insights"])
        result = ""
        for chunk in self.generate(prompt, stream=False):
            result += chunk
        return result
