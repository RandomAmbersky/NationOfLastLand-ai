//! Selection component for tracking selected units

use serde::{Deserialize, Serialize};

/// Selection component for entities that can be selected
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Selection {
    pub is_selected: bool,
    pub group_id: Option<u32>,
}

impl Selection {
    pub fn new() -> Self {
        Self {
            is_selected: false,
            group_id: None,
        }
    }

    pub fn selected() -> Self {
        Self {
            is_selected: true,
            group_id: None,
        }
    }

    pub fn selected_with_group(group_id: u32) -> Self {
        Self {
            is_selected: true,
            group_id: Some(group_id),
        }
    }

    pub fn select(&mut self) {
        self.is_selected = true;
    }

    pub fn deselect(&mut self) {
        self.is_selected = false;
        self.group_id = None;
    }

    pub fn set_group(&mut self, group_id: u32) {
        self.group_id = Some(group_id);
    }

    pub fn clear_group(&mut self) {
        self.group_id = None;
    }

    pub fn is_in_group(&self, group_id: u32) -> bool {
        self.group_id == Some(group_id)
    }
}
