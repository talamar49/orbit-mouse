import type { CommunityDriver } from '../hardware/communitySdk'

// Community drivers are deliberately registered at build time. This keeps
// hardware access reviewable and prevents Orbit from executing arbitrary code
// downloaded from the internet. Contributors add their driver to this list.
export const communityDrivers: readonly CommunityDriver[] = []
