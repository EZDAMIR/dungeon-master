import type { ProfileUpdate } from '../api/types'
import { ProfileSettings } from '../features/profile/ProfileSettings'
export function ProfilePage(props:{profile:ProfileUpdate;message:string;onSave:(profile:ProfileUpdate)=>Promise<void>;onBack:()=>void}){return <ProfileSettings {...props}/>}
