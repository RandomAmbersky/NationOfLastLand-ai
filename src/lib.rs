pub mod api;
pub mod config;
pub mod game;
pub mod types;

// Re-export commonly used types for examples and external usage
pub use api::group::{
    has_immobile_player_unit_selected,
    has_non_player_unit_selected,
    get_selected_player_movable_units,
    is_non_player_faction_entity,
    handle_immobile_unit_selection,
    handle_non_player_unit_selection,
    handle_group_targeting,
    handle_standard_entity_selection,
    select_entity_internal,
    get_selected_entities_internal,
    SelectionResult,
    SelectionAction,
    TargetAssignment,
};
pub use game::components::{
    FactionComponent,
    Vehicle,
    Base,
    Alert,
    Position,
    Movement,
    Selection,
    Faction,
    VehicleType,
    AlertType,
};

use wasm_bindgen::prelude::*;

// When the `wee_alloc` feature is enabled, use `wee_alloc` as the global
// allocator.
#[cfg(feature = "wee_alloc")]
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc::INIT;

// This is like the `main` function, except for JavaScript.
#[wasm_bindgen(start)]
pub fn main_js() -> Result<(), JsValue> {
    // This provides better error messages in debug mode.
    // It's disabled in release mode so it doesn't bloat up the file size.
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();

    Ok(())
}

#[wasm_bindgen]
extern "C" {
    fn alert(s: &str);
}

#[wasm_bindgen]
pub fn greet() {
    alert("Hello, nation-of-last-land!");
}
