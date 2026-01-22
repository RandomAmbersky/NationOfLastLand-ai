use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
pub struct MovementResult {
    pub success: bool,
    pub message: String,
}