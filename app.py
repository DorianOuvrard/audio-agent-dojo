import os
import streamlit as st
from dotenv import load_dotenv
from deepgram import DeepgramClient

load_dotenv()

st.set_page_config(page_title="Audio Agent Dojo", page_icon="🎙️", layout="wide")

st.title("Audio Agent Dojo 🎙️")
st.caption("Voice AI experimentation playground")

# Initialize Deepgram client
@st.cache_resource
def get_deepgram_client():
    api_key = os.getenv("DEEPGRAM_API_KEY")
    if not api_key:
        st.error("DEEPGRAM_API_KEY not found in .env")
        return None
    return DeepgramClient(api_key=api_key)

client = get_deepgram_client()

# System prompt
system_prompt = st.text_area(
    "System Prompt",
    value="You are a helpful assistant. Keep responses brief.",
    height=100
)

st.divider()

# Audio input
audio_file = st.audio_input("🎤 Record your message")

if audio_file and client:
    with st.spinner("Transcribing..."):
        # STT: Audio -> Text (SDK v5 API)
        audio_bytes = audio_file.read()

        response = client.listen.v1.media.transcribe_file(
            request=audio_bytes,
            model="nova-3",
            language="en",
            smart_format=True,
        )

        transcript = response.results.channels[0].alternatives[0].transcript

    st.markdown("**You said:**")
    st.info(transcript)

    # Simple echo response (replace with LLM later)
    assistant_response = f"I heard you say: {transcript}"

    st.markdown("**Assistant:**")
    st.success(assistant_response)

    # TTS: Text -> Audio (SDK v5 API)
    with st.spinner("Generating audio..."):
        audio_response = client.speak.v1.audio.generate(
            text=assistant_response,
            model="aura-2-asteria-en",
        )

        # Collect audio chunks from generator
        audio_data = b"".join(chunk for chunk in audio_response)
        st.audio(audio_data, format="audio/mp3")
