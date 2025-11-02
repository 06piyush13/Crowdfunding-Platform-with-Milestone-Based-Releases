#![allow(non_snake_case)]
#![no_std]
use soroban_sdk::{contract, contracttype, contractimpl, log, Env, Symbol, String, Address, symbol_short};

// Structure to track campaign details
#[contracttype]
#[derive(Clone)]
pub struct Campaign {
    pub campaign_id: u64,
    pub creator: Address,
    pub title: String,
    pub target_amount: u64,
    pub raised_amount: u64,
    pub milestone_count: u64,
    pub completed_milestones: u64,
    pub is_active: bool,
}

// Structure to track individual milestones
#[contracttype]
#[derive(Clone)]
pub struct Milestone {
    pub milestone_id: u64,
    pub campaign_id: u64,
    pub description: String,
    pub release_amount: u64,
    pub is_completed: bool,
    pub is_approved: bool,
}

// Mapping for campaigns
#[contracttype]
pub enum CampaignBook {
    Campaign(u64)
}

// Mapping for milestones
#[contracttype]
pub enum MilestoneBook {
    Milestone(u64, u64) // (campaign_id, milestone_id)
}

// Counter for campaigns
const CAMPAIGN_COUNT: Symbol = symbol_short!("C_COUNT");

#[contract]
pub struct CrowdfundingContract;

#[contractimpl]
impl CrowdfundingContract {

    // Function to create a new crowdfunding campaign
    pub fn create_campaign(
        env: Env, 
        creator: Address, 
        title: String, 
        target_amount: u64,
        milestone_count: u64
    ) -> u64 {
        creator.require_auth();
        
        let mut campaign_count: u64 = env.storage().instance().get(&CAMPAIGN_COUNT).unwrap_or(0);
        campaign_count += 1;

        let campaign = Campaign {
            campaign_id: campaign_count,
            creator: creator.clone(),
            title: title.clone(),
            target_amount,
            raised_amount: 0,
            milestone_count,
            completed_milestones: 0,
            is_active: true,
        };

        env.storage().instance().set(&CampaignBook::Campaign(campaign_count), &campaign);
        env.storage().instance().set(&CAMPAIGN_COUNT, &campaign_count);
        env.storage().instance().extend_ttl(10000, 10000);

        log!(&env, "Campaign Created with ID: {}", campaign_count);
        campaign_count
    }

    // Function to contribute funds to a campaign
    pub fn contribute(env: Env, campaign_id: u64, backer: Address, amount: u64) {
        backer.require_auth();
        
        let mut campaign = Self::view_campaign(env.clone(), campaign_id);
        
        if !campaign.is_active {
            panic!("Campaign is not active!");
        }

        campaign.raised_amount += amount;
        
        env.storage().instance().set(&CampaignBook::Campaign(campaign_id), &campaign);
        env.storage().instance().extend_ttl(10000, 10000);

        log!(&env, "Contribution of {} made to Campaign ID: {}", amount, campaign_id);
    }

    // Function to approve milestone completion and release funds
    pub fn approve_milestone(env: Env, campaign_id: u64, milestone_id: u64) {
        let mut campaign = Self::view_campaign(env.clone(), campaign_id);
        let mut milestone = Self::view_milestone(env.clone(), campaign_id, milestone_id);

        if milestone.is_completed {
            panic!("Milestone already completed!");
        }

        if campaign.raised_amount < milestone.release_amount {
            panic!("Insufficient funds in campaign!");
        }

        milestone.is_completed = true;
        milestone.is_approved = true;
        campaign.raised_amount -= milestone.release_amount;
        campaign.completed_milestones += 1;

        env.storage().instance().set(&MilestoneBook::Milestone(campaign_id, milestone_id), &milestone);
        env.storage().instance().set(&CampaignBook::Campaign(campaign_id), &campaign);
        env.storage().instance().extend_ttl(10000, 10000);

        log!(&env, "Milestone {} approved for Campaign {}", milestone_id, campaign_id);
    }

    // Function to create a milestone for a campaign
    pub fn create_milestone(
        env: Env,
        campaign_id: u64,
        milestone_id: u64,
        description: String,
        release_amount: u64
    ) {
        let campaign = Self::view_campaign(env.clone(), campaign_id);
        campaign.creator.require_auth();

        let milestone = Milestone {
            milestone_id,
            campaign_id,
            description,
            release_amount,
            is_completed: false,
            is_approved: false,
        };

        env.storage().instance().set(&MilestoneBook::Milestone(campaign_id, milestone_id), &milestone);
        env.storage().instance().extend_ttl(10000, 10000);

        log!(&env, "Milestone {} created for Campaign {}", milestone_id, campaign_id);
    }

    // View function to get campaign details
    pub fn view_campaign(env: Env, campaign_id: u64) -> Campaign {
        let key = CampaignBook::Campaign(campaign_id);
        env.storage().instance().get(&key).unwrap_or(Campaign {
            campaign_id: 0,
            creator: Address::from_string(&String::from_str(&env, "default")),
            title: String::from_str(&env, "Not_Found"),
            target_amount: 0,
            raised_amount: 0,
            milestone_count: 0,
            completed_milestones: 0,
            is_active: false,
        })
    }

    // View function to get milestone details
    pub fn view_milestone(env: Env, campaign_id: u64, milestone_id: u64) -> Milestone {
        let key = MilestoneBook::Milestone(campaign_id, milestone_id);
        env.storage().instance().get(&key).unwrap_or(Milestone {
            milestone_id: 0,
            campaign_id: 0,
            description: String::from_str(&env, "Not_Found"),
            release_amount: 0,
            is_completed: false,
            is_approved: false,
        })
    }
}