// lib.rs
#![no_std]
use soroban_sdk::{contractimpl, symbol, symbol_short, vec, Address, BytesN, Env, Map, Vec, panic_with_error};

#[derive(Clone)]
pub struct Milestone {
    pub id: u32,
    pub title: soroban_sdk::String,
    pub description: soroban_sdk::String,
    pub target_amount: i128,
    pub released_amount: i128,
    pub approval_count: u32,
    pub required_approvals: u32,
    pub is_approved: bool,
    pub is_completed: bool,
}

impl Milestone {
    pub fn to_map(&self, e: &Env) -> Map {
        let mut m = Map::new(e);
        m.set(symbol!("id"), self.id);
        m.set(symbol!("title"), self.title.clone());
        m.set(symbol!("description"), self.description.clone());
        m.set(symbol!("target_amount"), self.target_amount);
        m.set(symbol!("released_amount"), self.released_amount);
        m.set(symbol!("approval_count"), self.approval_count);
        m.set(symbol!("required_approvals"), self.required_approvals);
        m.set(symbol!("is_approved"), self.is_approved);
        m.set(symbol!("is_completed"), self.is_completed);
        m
    }
}

#[derive(Clone)]
pub struct Campaign {
    pub id: u32,
    pub creator: Address,
    pub title: soroban_sdk::String,
    pub description: soroban_sdk::String,
    pub target_amount: i128,
    pub raised_amount: i128,
    pub is_active: bool,
    pub milestones: Vec<Milestone>,
}

impl Campaign {
    pub fn to_map(&self, e: &Env) -> Map {
        let mut m = Map::new(e);
        m.set(symbol!("id"), self.id);
        m.set(symbol!("creator"), self.creator.clone());
        m.set(symbol!("title"), self.title.clone());
        m.set(symbol!("description"), self.description.clone());
        m.set(symbol!("target_amount"), self.target_amount);
        m.set(symbol!("raised_amount"), self.raised_amount);
        m.set(symbol!("is_active"), self.is_active);
        // milestones -> vec of maps
        let mut mv = Vec::new(e);
        for ms in self.milestones.iter() {
            mv.push_back(ms.to_map(e));
        }
        m.set(symbol!("milestones"), mv);
        m
    }
}

// Storage keys
const KEY_CAMPAIGN_COUNTER: &str = "campaign_counter";
const KEY_CAMPAIGN_PREFIX: &str = "campaign_";

pub struct Contract;

#[contractimpl]
impl Contract {
    // Create a new campaign. caller (sender) or provided creator address may be used as creator.
    pub fn create_campaign(e: Env, creator: Address, title: soroban_sdk::String, description: soroban_sdk::String, target_amount: i128, milestone_count: u32) -> u32 {
        // increment global counter
        let mut counter: u32 = if e.storage().has(&KEY_CAMPAIGN_COUNTER.into()) {
            e.storage().get_unchecked(&KEY_CAMPAIGN_COUNTER.into()).unwrap()
        } else {
            0
        };
        counter = counter + 1;
        e.storage().set(&KEY_CAMPAIGN_COUNTER.into(), &counter);

        let id = counter;

        // create empty milestones placeholder (we expect create_milestone to be called for each)
        let mut milestones = Vec::new(&e);
        for i in 1..=milestone_count {
            let ms = Milestone {
                id: i,
                title: soroban_sdk::String::from_slice(&e, ""),
                description: soroban_sdk::String::from_slice(&e, ""),
                target_amount: 0,
                released_amount: 0,
                approval_count: 0,
                required_approvals: 0,
                is_approved: false,
                is_completed: false,
            };
            milestones.push_back(ms);
        }

        let campaign = Campaign {
            id,
            creator: creator.clone(),
            title,
            description,
            target_amount,
            raised_amount: 0,
            is_active: true,
            milestones,
        };

        let key = Campaign::storage_key_for(id);
        e.storage().set(&key, &campaign.to_map(&e));
        id
    }

    // Create/Update a milestone for a campaign
    pub fn create_milestone(e: Env, campaign_id: u32, milestone_id: u32, description: soroban_sdk::String, release_amount: i128, required_approvals: u32) {
        let key = Campaign::storage_key_for(campaign_id);
        if !e.storage().has(&key) {
            panic_with_error!(&e, symbol_short!("ERR_CAMPAIGN_NOT_FOUND"));
        }
        let mut campaign_map: Map = e.storage().get_unchecked(&key).unwrap();
        // fetch existing milestones vec
        let mut milestones_vec: Vec<Map> = campaign_map.get(symbol!("milestones")).unwrap_or_default();

        // ensure milestone index exists or expand
        let idx = (milestone_id - 1) as usize;
        if idx < (milestones_vec.len() as usize) {
            // update existing placeholder
            let mut ms_map = Map::new(&e);
            ms_map.set(symbol!("id"), milestone_id);
            ms_map.set(symbol!("title"), soroban_sdk::String::from_slice(&e, ""));
            ms_map.set(symbol!("description"), description);
            ms_map.set(symbol!("target_amount"), release_amount);
            ms_map.set(symbol!("released_amount"), 0i128);
            ms_map.set(symbol!("approval_count"), 0u32);
            ms_map.set(symbol!("required_approvals"), required_approvals);
            ms_map.set(symbol!("is_approved"), false);
            ms_map.set(symbol!("is_completed"), false);
            milestones_vec.set(idx as u32, ms_map);
        } else {
            // append if index out of range (keeps simple behavior)
            let mut ms_map = Map::new(&e);
            ms_map.set(symbol!("id"), milestone_id);
            ms_map.set(symbol!("title"), soroban_sdk::String::from_slice(&e, ""));
            ms_map.set(symbol!("description"), description);
            ms_map.set(symbol!("target_amount"), release_amount);
            ms_map.set(symbol!("released_amount"), 0i128);
            ms_map.set(symbol!("approval_count"), 0u32);
            ms_map.set(symbol!("required_approvals"), required_approvals);
            ms_map.set(symbol!("is_approved"), false);
            ms_map.set(symbol!("is_completed"), false);
            milestones_vec.push_back(ms_map);
        }

        campaign_map.set(symbol!("milestones"), milestones_vec);
        e.storage().set(&key, &campaign_map);
    }

    // Contribute (bookkeeping). Real token transfer must be made at client/server level if needed.
    pub fn contribute(e: Env, campaign_id: u32, backer: Address, amount: i128) {
        let key = Campaign::storage_key_for(campaign_id);
        if !e.storage().has(&key) {
            panic_with_error!(&e, symbol_short!("ERR_CAMPAIGN_NOT_FOUND"));
        }
        let mut campaign_map: Map = e.storage().get_unchecked(&key).unwrap();
        let mut raised: i128 = campaign_map.get(symbol!("raised_amount")).unwrap_or(0i128);
        raised = raised + amount;
        campaign_map.set(symbol!("raised_amount"), raised);
        e.storage().set(&key, &campaign_map);
        // optionally emit event -- Soroban event APIs omitted for brevity
    }

    // Backer approves a milestone
    pub fn approve_milestone(e: Env, campaign_id: u32, milestone_id: u32, backer: Address) {
        let key = Campaign::storage_key_for(campaign_id);
        if !e.storage().has(&key) {
            panic_with_error!(&e, symbol_short!("ERR_CAMPAIGN_NOT_FOUND"));
        }
        let mut campaign_map: Map = e.storage().get_unchecked(&key).unwrap();
        let mut milestones_vec: Vec<Map> = campaign_map.get(symbol!("milestones")).unwrap_or_default();
        let idx = (milestone_id - 1) as usize;
        if idx >= (milestones_vec.len() as usize) {
            panic_with_error!(&e, symbol_short!("ERR_MILESTONE_NOT_FOUND"));
        }
        let mut ms_map = milestones_vec.get(idx as u32).unwrap();
        let mut approval_count: u32 = ms_map.get(symbol!("approval_count")).unwrap_or(0u32);
        approval_count = approval_count + 1;
        ms_map.set(symbol!("approval_count"), approval_count);

        let required: u32 = ms_map.get(symbol!("required_approvals")).unwrap_or(1u32);
        if approval_count >= required {
            ms_map.set(symbol!("is_approved"), true);
        }
        milestones_vec.set(idx as u32, ms_map);
        campaign_map.set(symbol!("milestones"), milestones_vec);
        e.storage().set(&key, &campaign_map);
    }

    // Release milestone funds (only creator allowed). Marks milestone completed and reduces raised_amount bookkeeping.
    pub fn release_milestone(e: Env, campaign_id: u32, milestone_id: u32, requester: Address) {
        let key = Campaign::storage_key_for(campaign_id);
        if !e.storage().has(&key) {
            panic_with_error!(&e, symbol_short!("ERR_CAMPAIGN_NOT_FOUND"));
        }
        let mut campaign_map: Map = e.storage().get_unchecked(&key).unwrap();
        let creator: Address = campaign_map.get(symbol!("creator")).unwrap();
        // verify requester is creator
        if requester != creator {
            panic_with_error!(&e, symbol_short!("ERR_NOT_CREATOR"));
        }
        let mut milestones_vec: Vec<Map> = campaign_map.get(symbol!("milestones")).unwrap_or_default();
        let idx = (milestone_id - 1) as usize;
        if idx >= (milestones_vec.len() as usize) {
            panic_with_error!(&e, symbol_short!("ERR_MILESTONE_NOT_FOUND"));
        }
        let mut ms_map = milestones_vec.get(idx as u32).unwrap();
        let is_approved: bool = ms_map.get(symbol!("is_approved")).unwrap_or(false);
        let is_completed: bool = ms_map.get(symbol!("is_completed")).unwrap_or(false);
        if !is_approved {
            panic_with_error!(&e, symbol_short!("ERR_NOT_APPROVED"));
        }
        if is_completed {
            panic_with_error!(&e, symbol_short!("ERR_ALREADY_COMPLETED"));
        }
        let target_amount: i128 = ms_map.get(symbol!("target_amount")).unwrap_or(0i128);
        ms_map.set(symbol!("released_amount"), target_amount);
        ms_map.set(symbol!("is_completed"), true);
        miles_set_and_reduce(&e, &mut campaign_map, idx as u32, ms_map, target_amount);
        e.storage().set(&key, &campaign_map);
    }

    // helper read-only getters
    pub fn get_campaign(e: Env, campaign_id: u32) -> Map {
        let key = Campaign::storage_key_for(campaign_id);
        if !e.storage().has(&key) {
            panic_with_error!(&e, symbol_short!("ERR_CAMPAIGN_NOT_FOUND"));
        }
        e.storage().get_unchecked(&key).unwrap()
    }
}

// helper to update milestone map and decrease raised amount in campaign map
fn miles_set_and_reduce(e: &Env, campaign_map: &mut Map, idx: u32, ms_map: Map, deduct: i128) {
    let mut milestones_vec: Vec<Map> = campaign_map.get(symbol!("milestones")).unwrap_or_default();
    milestones_vec.set(idx, ms_map);
    campaign_map.set(symbol!("milestones"), milestones_vec);

    let mut raised: i128 = campaign_map.get(symbol!("raised_amount")).unwrap_or(0i128);
    // prevent negative underflow
    if raised >= deduct {
        raised = raised - deduct;
    } else {
        raised = 0;
    }
    campaign_map.set(symbol!("raised_amount"), raised);
}

// convenience: assemble storage key
impl Campaign {
    fn storage_key_for(id: u32) -> soroban_sdk::storage::StorageKey {
        let mut v = Vec::new(&Env::default());
        v.push_back(soroban_sdk::String::from_slice(&Env::default(), KEY_CAMPAIGN_PREFIX));
        v.push_back(id);
        soroban_sdk::storage::StorageKey::Contract(soroban_sdk::Symbol::from_str("campaign").into(), v)
    }
}

#[cfg(test)]
mod test {
    // tests omitted for brevity in this example
}
