import { UserService } from '../microservices';

export interface IdentityContext {
  userId: string;
  userRole: 'Student' | 'Faculty' | 'Admin';
  userName: string;
  agentId: string;
}

export class AuthMapper {
  public static resolveIdentity(userToken: string, agentToken: string): IdentityContext | null {
    // Map user token to known mock user
    let userId = 'usr_student_01'; // Default delegated student
    if (userToken === 'token_faculty_01' || userToken === 'usr_faculty_01') {
      userId = 'usr_faculty_01';
    } else if (userToken === 'token_student_02' || userToken === 'usr_student_02') {
      userId = 'usr_student_02';
    } else if (userToken) {
      userId = userToken;
    }

    const userProfile = UserService.getUserProfile(userId);
    if (!userProfile.success || !userProfile.user) {
      return null;
    }

    return {
      userId: userProfile.user.id,
      userRole: userProfile.user.role,
      userName: userProfile.user.name,
      agentId: agentToken || 'agent_campus_assistant'
    };
  }
}
