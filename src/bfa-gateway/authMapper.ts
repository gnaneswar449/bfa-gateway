import { UserService } from '../microservices';

export interface IdentityContext {
  userId: string;
  userRole: 'Student' | 'Faculty' | 'Admin';
  userName: string;
  agentId: string;
}

export class AuthMapper {
  public static resolveIdentity(userToken: string, agentToken: string): IdentityContext | null {
    if (!userToken || typeof userToken !== 'string') {
      return null;
    }

    const cleanToken = userToken.trim();
    if (cleanToken.length === 0 || cleanToken.length > 100) {
      return null;
    }

    // Map token to known user account
    let userId = 'usr_student_01'; // Default student
    if (cleanToken === 'token_faculty_01' || cleanToken === 'usr_faculty_01') {
      userId = 'usr_faculty_01';
    } else if (cleanToken === 'token_student_02' || cleanToken === 'usr_student_02') {
      userId = 'usr_student_02';
    } else if (cleanToken === 'token_admin_01' || cleanToken === 'usr_admin_01') {
      userId = 'usr_admin_01';
    } else {
      userId = cleanToken;
    }

    const userProfile = UserService.getUserProfile(userId);
    if (!userProfile.success || !userProfile.user) {
      return null;
    }

    const cleanAgentToken = (agentToken && typeof agentToken === 'string') ? agentToken.trim().slice(0, 50) : 'agent_campus_assistant';

    return {
      userId: userProfile.user.id,
      userRole: userProfile.user.role,
      userName: userProfile.user.name,
      agentId: cleanAgentToken || 'agent_campus_assistant'
    };
  }
}
