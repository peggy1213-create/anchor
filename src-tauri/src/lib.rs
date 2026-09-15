use serde::Deserialize;

const KEYRING_SERVICE: &str = "so.daodao.anchor";
const KEYRING_USER: &str = "anthropic-api-key";

const SYSTEM_PROMPT: &str = "You are Anchor's weekly reflective mirror. You write one short paragraph — 4 to 6 sentences — reflecting the past week back to the user in their own patterns. Your job is to notice, not prescribe. Never give advice. Never use productivity clichés. Never praise or scold. Never mention streaks or scores. Ground every observation in something the user actually wrote — their commitments, their carried items, their one-word check-outs, their 'what took your day' notes. When you notice a pattern (a repeatedly carried task, a recurring 'what took your day' phrase, a difference between days that had a protected thing and days that didn't), reflect it back as a gentle observation, not a directive. End with one small open question the user can sit with — not a to-do. Warm, quiet, human. No bullet points. No headings. No emoji.";

#[derive(serde::Serialize)]
struct AnthropicRequest {
    model: String,
    max_tokens: u32,
    system: String,
    messages: Vec<AnthropicRequestMessage>,
}

#[derive(serde::Serialize)]
struct AnthropicRequestMessage {
    role: String,
    content: String,
}

#[derive(Deserialize)]
struct AnthropicResponse {
    content: Vec<AnthropicContentBlock>,
}

#[derive(Deserialize)]
struct AnthropicContentBlock {
    text: Option<String>,
}

#[tauri::command]
async fn generate_weekly_reflection(week_json: String) -> Result<String, String> {
    let api_key = get_stored_key().map_err(|e| format!("No API key: {}", e))?;

    let user_message = format!("Here is the past week. Write the reflection.\n\n{}", week_json);

    let request_body = AnthropicRequest {
        model: "claude-opus-4-7".to_string(),
        max_tokens: 512,
        system: SYSTEM_PROMPT.to_string(),
        messages: vec![AnthropicRequestMessage {
            role: "user".to_string(),
            content: user_message,
        }],
    };

    let client = reqwest::Client::new();
    let response = client
        .post("https://api.anthropic.com/v1/messages")
        .header("x-api-key", &api_key)
        .header("anthropic-version", "2023-06-01")
        .header("content-type", "application/json")
        .json(&request_body)
        .timeout(std::time::Duration::from_secs(20))
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(format!("API error {}: {}", status, body));
    }

    let parsed: AnthropicResponse = response
        .json()
        .await
        .map_err(|e| format!("Parse error: {}", e))?;

    parsed
        .content
        .into_iter()
        .find_map(|block| block.text)
        .ok_or_else(|| "Empty response".to_string())
}

fn get_stored_key() -> Result<String, String> {
    let entry = keyring::Entry::new(KEYRING_SERVICE, KEYRING_USER)
        .map_err(|e| e.to_string())?;
    entry.get_password().map_err(|e| e.to_string())
}

#[tauri::command]
async fn set_api_key(key: String) -> Result<(), String> {
    let entry = keyring::Entry::new(KEYRING_SERVICE, KEYRING_USER)
        .map_err(|e| e.to_string())?;
    entry.set_password(&key).map_err(|e| e.to_string())
}

#[tauri::command]
async fn has_api_key() -> Result<bool, String> {
    match get_stored_key() {
        Ok(_) => Ok(true),
        Err(_) => Ok(false),
    }
}

#[tauri::command]
async fn delete_api_key() -> Result<(), String> {
    let entry = keyring::Entry::new(KEYRING_SERVICE, KEYRING_USER)
        .map_err(|e| e.to_string())?;
    match entry.delete_credential() {
        Ok(()) => Ok(()),
        Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(e.to_string()),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            generate_weekly_reflection,
            set_api_key,
            has_api_key,
            delete_api_key,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
