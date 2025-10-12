This folder contains Supabase Edge Functions that call Google's Gemini (Generative Language) APIs.

Configuration

- GEMINI_API_KEY: Required. Set this to your Google API key that has access to the Generative Language API.
- GEMINI_MODEL: Optional. If set, the functions will use this model name (for example `gemini-1.5-flash` or `gemini-1.5`). If not set the function attempts to call ListModels and select a suitable model automatically.

Common issues

- 404 / model not found: The Generative Language API returns a 404 when the model name is incorrect for the API version. If you see an error like `models/gemini-1.5-flash is not found for API version v1beta`, either set `GEMINI_MODEL` to one of the models returned by the ListModels endpoint in your project/region, or ensure your API key has access to the requested model and API version.

- To debug, check your function logs and look for the `provider_error` field returned in the JSON response. It contains the body returned by the Gemini API and usually includes a helpful error message from the provider.

Notes

The functions will attempt to normalize model names returned by the API (strip any leading `models/` prefix) before building the request URL.