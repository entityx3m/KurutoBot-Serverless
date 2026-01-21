// utils/linkHelper.ts
import type { PlayerAccount, UserData } from "./kvHelper";
import { getUserData, setUserData, getUserIdByTag, linkTagToUser } from "./kvHelper";

const COC_API_BASE_URL = "https://cocproxy.royaleapi.dev/v1";
const VERIFIED_ROLE_ID = "REDACTED_VERIFIED_ID";

export interface LinkAccountResult {
  success: boolean;
  message: string;
  alreadyLinked?: boolean;
  userData?: UserData;
  playerData?: any;
  isFirstAccount?: boolean;
  playerTag?: string;
}

/**
 * Master function to link a CoC account to a Discord user
 * Used by add.ts, link.ts, and postlink.ts
 */
export async function linkPlayerAccount(
  playerTag: string,
  userId: string,
  discordUsername: string,
  executorId?: string, // Staff member who performed the linking (if any)
  guildId?: string, // For role assignment
  shouldAssignVerifiedRole: boolean = true,
  shouldSetNickname: boolean = true
): Promise<LinkAccountResult> {
  try {
    // Validate player tag
    const cleanTag = playerTag.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!/^[A-Z0-9]{3,15}$/.test(cleanTag)) {
      return {
        success: false,
        message: "<a:redcross:1439044567415521443> **Invalid Player Tag**\nExample: `#ABCDEFGH` or just `ABCDEFGH`"
      };
    }

    // Check if tag is already linked to someone else
    const existingUserId = await getUserIdByTag(cleanTag);
    if (existingUserId && existingUserId !== userId) {
      return {
        success: false,
        message: `<a:redcross:1439044567415521443> **Tag Already Used**\nAccount **#${cleanTag}** is already linked to another user.`
      };
    }

    // Get or create user data first
    let userData = await getUserData(userId);
    const isFirstAccount = !userData || userData.accounts.length === 0;

    if (!userData) {
      userData = {
        discordId: userId,
        discordName: discordUsername,
        accounts: [],
        lastUpdated: new Date().toISOString(),
      };
    }

    // Check if account already linked to this user
    const existingAccount = userData.accounts.find(acc => acc.playerTag === cleanTag);
    if (existingAccount) {
      return {
        success: true,
        alreadyLinked: true,
        message: `<a:AnimatedCheck:1427570005750448169> **Account Already Linked**\nAccount **#${cleanTag}** (${existingAccount.playerName}) is already linked to your profile.\n\n**👤 Account:** ${existingAccount.playerName}\n**🏷️ Tag:** #${cleanTag}\n**🏰 TH:** Level ${existingAccount.townHallLevel}\n\nUse **My Accounts** button or \`/player\` to view all your linked accounts.`,
        userData,
        playerData: null,
        isFirstAccount: false,
        playerTag: cleanTag
      };
    }

    // Verify player tag with CoC API
    const response = await fetch(`${COC_API_BASE_URL}/players/%23${cleanTag}`, {
      headers: { 
        'Authorization': `Bearer ${process.env.COC_API_KEY}`, 
        'Accept': 'application/json' 
      },
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        return {
          success: false,
          message: `<a:redcross:1439044567415521443> **Player Not Found**\nTag **#${cleanTag}** not found. Check tag or profile privacy.`
        };
      }
      throw new Error(`CoC API error: ${response.status}`);
    }
    
    const playerData = await response.json();
    const playerName = playerData.name;
    const thLevel = playerData.townHallLevel;
    const expLevel = playerData.expLevel;

    // Create new account record
    const newAccount: PlayerAccount = {
      playerTag: cleanTag,
      playerName,
      townHallLevel: thLevel,
      expLevel: expLevel,
      leagueTier: playerData.leagueTier ? {
        name: playerData.leagueTier.name,
        iconUrls: playerData.leagueTier.iconUrls
      } : undefined,
      clan: playerData.clan ? {
        tag: playerData.clan.tag,
        name: playerData.clan.name
      } : undefined,
      role: playerData.role,
      warPreference: playerData.warPreference,
      isMain: isFirstAccount,
      linkedAt: new Date().toISOString(),
      linkedBy: executorId || userId,
    };
    
    // Add account to user data
    userData.accounts.push(newAccount);
    
    // If this is the first account, set as main
    if (isFirstAccount) {
      userData.mainAccountTag = cleanTag;
    }
    
    // Save user data and create reverse mapping
    await setUserData(userId, userData);
    await linkTagToUser(cleanTag, userId);
    
    console.log(`✅ Linked account #${cleanTag} to ${discordUsername}`);

    // Assign Verified role if first account and guild ID provided
    if (isFirstAccount && shouldAssignVerifiedRole && guildId) {
      try {
        const auditReason = `CoC account linked - ${playerName} (#${cleanTag})`;
        await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${userId}/roles/${VERIFIED_ROLE_ID}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bot ${process.env.DISCORD_TOKEN}`,
            'Content-Type': 'application/json',
            'X-Audit-Log-Reason': auditReason
          },
        });
        console.log(`✅ Assigned Verified role to ${discordUsername}`);
      } catch (roleError) {
        console.warn(`⚠️ Failed to assign Verified role to ${discordUsername}:`, roleError);
      }
    }

    // Set nickname if main account
    if (newAccount.isMain && shouldSetNickname && guildId) {
      try {
        const nickname = `${playerName} | TH${thLevel}`;
        await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${userId}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bot ${process.env.DISCORD_TOKEN}`,
            'Content-Type': 'application/json',
            'X-Audit-Log-Reason': `Nickname set from main account ${playerName}`
          },
          body: JSON.stringify({ nick: nickname }),
        });
        userData.nickname = nickname;
        await setUserData(userId, userData);
        console.log(`✅ Set nickname for ${discordUsername} to "${nickname}"`);
      } catch (nicknameError) {
        console.warn(`⚠️ Failed to set nickname for ${discordUsername}:`, nicknameError);
      }
    }

    return {
      success: true,
      message: `<a:AnimatedCheck:1427570005750448169> **Account Successfully Linked!**\n**👤 CoC Account:** ${playerName}\n**🏷️ Player Tag:** #${cleanTag}\n**🏰 Town Hall:** Level ${thLevel}`,
      userData,
      playerData,
      isFirstAccount,
      playerTag: cleanTag
    };
    
  } catch (error) {
    console.error('Error in linkPlayerAccount:', error);
    return {
      success: false,
      message: `<a:redcross:1439044567415521443> **Linking Failed**\n${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Helper to validate a player tag format
 */
export function validatePlayerTag(tag: string): { valid: boolean; cleanTag: string; error?: string } {
  const cleanTag = tag.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  
  if (!cleanTag || !/^[A-Z0-9]{3,15}$/.test(cleanTag)) {
    return {
      valid: false,
      cleanTag,
      error: "<a:redcross:1439044567415521443> **Invalid Player Tag**\nExample: `#ABCDEFGH` or just `ABCDEFGH`"
    };
  }
  
  return { valid: true, cleanTag };
}

/**
 * Restores Verified role and nickname for rejoining members
 * This should be called when a user with existing linked accounts interacts with the bot
 */
export async function restoreUserRolesAndNickname(
  userId: string,
  guildId: string,
  discordUsername: string
): Promise<{ 
  verifiedRoleAssigned: boolean; 
  nicknameUpdated: boolean; 
  mainAccount?: PlayerAccount;
}> {
  try {
    const userData = await getUserData(userId);
    if (!userData || userData.accounts.length === 0) {
      return { verifiedRoleAssigned: false, nicknameUpdated: false };
    }

    let verifiedRoleAssigned = false;
    let nicknameUpdated = false;
    let mainAccount: PlayerAccount | undefined;

    // Get main account
    mainAccount = userData.accounts.find(acc => acc.isMain) || userData.accounts[0];

    // Check if user already has Verified role
    const memberResponse = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${userId}`, {
      headers: { 
        'Authorization': `Bot ${process.env.DISCORD_TOKEN}` 
      },
    });

    if (memberResponse.ok) {
      const member = await memberResponse.json();
      const hasVerifiedRole = member.roles?.includes(VERIFIED_ROLE_ID);

      // Assign Verified role if missing
      if (!hasVerifiedRole) {
        try {
          const auditReason = `Restored Verified role for rejoining member with linked CoC account`;
          await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${userId}/roles/${VERIFIED_ROLE_ID}`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bot ${process.env.DISCORD_TOKEN}`,
              'Content-Type': 'application/json',
              'X-Audit-Log-Reason': auditReason
            },
          });
          verifiedRoleAssigned = true;
          console.log(`✅ Restored Verified role to ${discordUsername}`);
        } catch (roleError) {
          console.warn(`⚠️ Failed to restore Verified role to ${discordUsername}:`, roleError);
        }
      }

      // Update nickname if incorrect
      if (mainAccount) {
        const expectedNickname = `${mainAccount.playerName} | TH${mainAccount.townHallLevel}`;
        const currentNickname = member.nick || member.user.global_name || member.user.username;
        
        if (currentNickname !== expectedNickname) {
          try {
            const auditReason = `Restored nickname from linked CoC account: ${mainAccount.playerName}`;
            await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${userId}`, {
              method: 'PATCH',
              headers: {
                'Authorization': `Bot ${process.env.DISCORD_TOKEN}`,
                'Content-Type': 'application/json',
                'X-Audit-Log-Reason': auditReason
              },
              body: JSON.stringify({ nick: expectedNickname }),
            });
            nicknameUpdated = true;
            userData.nickname = expectedNickname;
            await setUserData(userId, userData);
            console.log(`✅ Restored nickname for ${discordUsername} to "${expectedNickname}"`);
          } catch (nicknameError) {
            console.warn(`⚠️ Failed to restore nickname for ${discordUsername}:`, nicknameError);
          }
        }
      }
    }

    return { verifiedRoleAssigned, nicknameUpdated, mainAccount };
    
  } catch (error) {
    console.error('Error in restoreUserRolesAndNickname:', error);
    return { verifiedRoleAssigned: false, nicknameUpdated: false };
  }
}

/**
 * Enhanced success message for account linking
 */
export function createEnhancedLinkSuccessMessage(
  playerName: string,
  playerTag: string,
  thLevel: number,
  isFirstAccount: boolean,
  verifiedAssigned: boolean,
  nicknameUpdated: boolean,
  mainAccount?: PlayerAccount
): string {
  let message = `<a:AnimatedCheck:1427570005750448169> **Account Successfully Linked!**\n\n`;
  
  message += `**👤 CoC Account:** ${playerName}\n`;
  message += `**🏷️ Player Tag:** #${playerTag}\n`;
  message += `**🏰 Town Hall:** Level ${thLevel}\n`;
  
  if (mainAccount?.clan) {
    message += `**👑 Clan:** ${mainAccount.clan.name}\n`;
  }
  
  message += `\n**🤔 What happened:**\n`;
  
  if (verifiedAssigned) {
    message += `• **Verified Role** was assigned\n`;
  } else {
    message += `• You already have the **Verified Role**\n`;
  }
  
  if (nicknameUpdated) {
    message += `• **Nickname** was updated to "${playerName} | TH${thLevel}"\n`;
  } else {
    message += `• Your **nickname** is already set correctly\n`;
  }
  
  message += `\n**🎫 Ticket Access:**\n`;
  message += `• You can now create tickets in the <#REDACTED_CHANNEL_VERIFICATION_ID> channel\n`;
  message += `• [Click here to Create a Ticket](https://discord.com/channels/REDACTED_GUILD_ID/REDACTED_CHANNEL_VERIFICATION_ID/1439260029328031776)\n`;
  
  message += `\n**🔧 Account Status:**\n`;
  message += `• Use **My Accounts** button to view all linked accounts\n`;
  message += `• Use \`/player\` command for detailed account info\n`;
  message += `• Use \`/unlink\` to remove accounts if needed\n`;
  message += `• Use \`/link\` to add more accounts\n`;
  
  if (isFirstAccount) {
    message += `\n**🎉 Welcome to BOOM House!** You can now apply to join our clans.`;
  } else {
    message += `\n**📝 Additional account linked!** Added to your profile.`;
  }
  
  return message;
}

/**
 * Enhanced message for restoring existing accounts
 */
export function createRestoreSuccessMessage(
  accounts: PlayerAccount[],
  verifiedAssigned: boolean,
  nicknameUpdated: boolean,
  mainAccount?: PlayerAccount
): string {
  let message = `<a:heya:1427561870797180928> **Welcome Back!**\n\n`;
  message += `I found ${accounts.length} linked CoC account${accounts.length > 1 ? 's' : ''} on your profile.\n\n`;
  
  message += `**📋 Your Linked Accounts:**\n`;
  accounts.forEach((account, index) => {
    const isMain = account.isMain ? " ⭐" : "";
    message += `${index + 1}. **${account.playerName}** (#${account.playerTag}) | TH${account.townHallLevel}${isMain}\n`;
  });
  
  message += `\n**🔧 Restoration Results:**\n`;
  
  if (verifiedAssigned) {
    message += `• **Verified Role** was restored\n`;
  } else {
    message += `• You already have the **Verified Role**\n`;
  }
  
  if (nicknameUpdated && mainAccount) {
    message += `• **Nickname** was restored to "${mainAccount.playerName} | TH${mainAccount.townHallLevel}"\n`;
  } else {
    message += `• Your **nickname** is already set correctly\n`;
  }
  
  message += `• **Ticket access** is now restored\n`;
  
  message += `\n**🔧 Account Management:**\n`;
  message += `• Use **My Accounts** button to view all linked accounts\n`;
  message += `• Use \`/player\` to view account details\n`;
  message += `• Use \`/unlink\` to remove accounts if needed\n`;
  message += `• Use \`/link\` to add more accounts\n`;
  
  return message;
}