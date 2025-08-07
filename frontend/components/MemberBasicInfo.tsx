import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardHeader, CardTitle, CardContent } from "@components/ui/card";
import { User, ChevronDown, ChevronRight, ChevronUp } from "lucide-react";
import { Member, MemberSkill } from "@shared/member";
import SkillsSelector from './SkillsSelector';
import EquipmentDeliverySection from './EquipmentDeliverySection';
import { formatDate, formatInputDate } from "../src/utils/dateUtils";
import { useAuth } from "../src/context/AuthContext";


interface MemberBasicInfoProps {
  member: Member;
  isEditing: boolean;
  editedMember: Member | null | undefined;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  handleSkillsChange?: (update: { skills: MemberSkill[]; other_skills: string }) => void;
  validationErrors?: Record<string, string>;
  onUpdate?: () => void;
  onMemberChange?: (updatedMember: Member) => void;
}

const MemberBasicInfo: React.FC<MemberBasicInfoProps> = ({
  member,
  isEditing,
  editedMember,
  handleChange,
  handleSkillsChange,
  validationErrors,
  onUpdate,
  onMemberChange,
}) => {
  const { user } = useAuth();
  const { t } = useTranslation('profile');
  const [showDetails, setShowDetails] = useState(false);
  const [showSkills, setShowSkills] = useState(false);

  // Determine if the user can view details
  // Admins, superusers, and the member viewing their own profile should always see details
  const isOwnProfile = user?.member_id === member.member_id;
  const isAdminOrSuperuser = user?.role === "member_administrator" || user?.role === "member_superuser";
  const canViewDetails = isOwnProfile || isAdminOrSuperuser;

  // Automatically show details if user has edit permission
  useEffect(() => {
    if (isEditing) {
      setShowDetails(true);
    }
  }, [isEditing]);

  if (!isEditing) {
    return (
      <Card>
        <CardHeader
          className={canViewDetails ? "cursor-pointer hover:bg-gray-50" : ""}
          onClick={() => canViewDetails && setShowDetails(!showDetails)}
        >
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <User className="h-5 w-5 mr-2" />
              {t('personalInfo.title')}
            </div>
            {canViewDetails && (
              showDetails ?
                <ChevronDown className="h-5 w-5" /> :
                <ChevronRight className="h-5 w-5" />
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {canViewDetails && showDetails ? (
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-500">{t('personalInfo.fullName')}</label>
                <p>
                  {member.first_name} {member.last_name}{member.nickname ? ` - ${member.nickname}` : ''}
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-500">{t('personalInfo.dateOfBirth')}</label>
                <span className="ml-2">{formatDate(member?.date_of_birth)}</span>
              </div>
              <div>
                <label className="text-sm text-gray-500">{t('personalInfo.gender')}</label>
                <span className="ml-2">{member?.gender ? t(`personalInfo.${member.gender}`) : ''}</span>
              </div>
              <div>
                <label className="text-sm text-gray-500">{t('personalInfo.oib')}</label>
                <span className="ml-2">{member?.oib}</span>
              </div>
              <div>
                <label className="text-sm text-gray-500">{t('personalInfo.email')}</label>
                <p>{member.email}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">{t('personalInfo.phone')}</label>
                <span className="ml-2">{member.cell_phone}</span>
              </div>
              <div>
                <label className="text-sm text-gray-500">{t('personalInfo.address')}</label>
                <p>{member.street_address},{member.city}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">{t('personalInfo.lifeStatus')}</label>
                <p>{t(`personalInfo.${member.life_status?.split('/')[0]}`)}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">{t('personalInfo.tShirtSize')}</label>
                <span className="ml-2">{member?.tshirt_size ?? t('personalInfo.notSet')}</span>
                {member?.tshirt_delivered && (
                  <span className="ml-2 text-green-500 font-bold">✓</span>
                )}
              </div>
              <div>
                <label className="text-sm text-gray-500">{t('personalInfo.shellJacketSize')}</label>
                <span className="ml-2">{member?.shell_jacket_size ?? t('personalInfo.notSet')}</span>
                {member?.shell_jacket_delivered && (
                  <span className="ml-2 text-green-500 font-bold">✓</span>
                )}
              </div>
              <div>
                <label className="text-sm text-gray-500">{t('personalInfo.hatSize')}</label>
                <span className="ml-2">{member?.hat_size ?? t('personalInfo.notSet')}</span>
                {member?.hat_delivered && (
                  <span className="ml-2 text-green-500 font-bold">✓</span>
                )}
              </div>
            </div>
          ) : canViewDetails ? (
            <p className="text-sm text-gray-500 italic">{t('personalInfo.viewPrompt')}</p>
          ) : (
            <p className="text-sm text-gray-500 italic">{t('personalInfo.privatePrompt')}</p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <User className="h-5 w-5" />
          {t('personalInfo.editTitle')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">{t('personalInfo.firstName')}</label>
            <input
              type="text"
              name="first_name"
              value={editedMember?.first_name ?? ""}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            />
            {validationErrors?.first_name && (
              <p className="text-sm text-red-500">{validationErrors.first_name}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t('personalInfo.lastName')}</label>
            <input
              type="text"
              name="last_name"
              value={editedMember?.last_name ?? ""}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            />
            {validationErrors?.last_name && (
              <p className="text-sm text-red-500">{validationErrors.last_name}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t('personalInfo.nickname')}</label>
            <input
              type="text"
              name="nickname"
              value={editedMember?.nickname ?? ""}
              onChange={handleChange}
              className="w-full p-2 border rounded"
              placeholder={t('personalInfo.nicknamePlaceholder')}
            />
          </div>
          <div>
            <label htmlFor="date_of_birth" className="block text-sm font-medium mb-1">
              {t('personalInfo.dateOfBirth')}
            </label>
            <input
              type="date"
              id="date_of_birth"
              name="date_of_birth"
              value={editedMember?.date_of_birth ? formatInputDate(editedMember.date_of_birth) : ''}
              onChange={handleChange}
              className={`w-full p-2 border rounded ${validationErrors?.date_of_birth ? 'border-red-500' : 'border-gray-300'}`}
              required
            />
            {validationErrors?.date_of_birth && (
              <p className="text-sm text-red-500 mt-1">{validationErrors.date_of_birth}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t('personalInfo.gender')}</label>
            <select
              name="gender"
              value={editedMember?.gender ?? ""}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            >
              <option value="male">{t('options.gender.male', { ns: 'profile' })}</option>
              <option value="female">{t('options.gender.female', { ns: 'profile' })}</option>
            </select>
            {validationErrors?.gender && (
              <p className="text-sm text-red-500">{validationErrors.gender}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t('personalInfo.oib')}</label>
            <input
              type="text"
              name="oib"
              value={editedMember?.oib ?? ""}
              onChange={handleChange}
              pattern="[0-9]{11}"
              title={t('editMemberForm.oibTitle')}
              className="w-full p-2 border rounded"
            />
            {validationErrors?.oib && (
              <p className="text-sm text-red-500">{validationErrors.oib}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t('personalInfo.email')}</label>
            <input
              type="email"
              name="email"
              value={editedMember?.email ?? ""}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            />
            {validationErrors?.email && (
              <p className="text-sm text-red-500">{validationErrors.email}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t('personalInfo.phone')}</label>
            <input
              type="tel"
              name="cell_phone"
              value={editedMember?.cell_phone ?? ""}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            />
            {validationErrors?.cell_phone && (
              <p className="text-sm text-red-500">{validationErrors.cell_phone}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              {t('personalInfo.address')}
            </label>
            <input
              type="text"
              name="street_address"
              value={editedMember?.street_address ?? ""}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            />
            {validationErrors?.street_address && (
              <p className="text-sm text-red-500">{validationErrors.street_address}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t('personalInfo.city')}</label>
            <input
              type="text"
              name="city"
              value={editedMember?.city ?? ""}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            />
            {validationErrors?.city && (
              <p className="text-sm text-red-500">{validationErrors.city}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              {t('personalInfo.lifeStatus')}
            </label>
            <select
              name="life_status"
              value={editedMember?.life_status ?? ""}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            >
              <option value="employed/unemployed">{t('personalInfo.employed')}</option>
              <option value="child/pupil/student">{t('personalInfo.child')}</option>
              <option value="pensioner">{t('personalInfo.pensioner')}</option>
            </select>
            {validationErrors?.life_status && (
              <p className="text-sm text-red-500">{validationErrors.life_status}</p>
            )}
          </div>

          {/* Add membership type dropdown */}
          <div>
            <label className="block text-sm font-medium mb-1">{t('personalInfo.membershipType')}</label>
            <select
              name="membership_type"
              value={editedMember?.membership_type ?? "regular"}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            >
              <option value="regular">{t('membershipDetailsCard.membershipType.regular', { ns: 'profile'})}</option>
              <option value="supporting">{t('membershipDetailsCard.membershipType.supporting', { ns: 'profile'})}</option>
              <option value="honorary">{t('membershipDetailsCard.membershipType.honorary', { ns: 'profile'})}</option>
            </select>
            {validationErrors?.membership_type && (
              <p className="text-sm text-red-500">{validationErrors.membership_type}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">{t('personalInfo.tShirtSize')}</label>
            <select
              name="tshirt_size"
              value={editedMember?.tshirt_size ?? ""}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            >
              <option value="XS">XS</option>
              <option value="S">S</option>
              <option value="M">M</option>
              <option value="L">L</option>
              <option value="XL">XL</option>
              <option value="XXL">XXL</option>
              <option value="XXXL">XXXL</option>
            </select>
            {validationErrors?.tshirt_size && (
              <p className="text-sm text-red-500">{validationErrors.tshirt_size}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">{t('personalInfo.shellJacketSize')}</label>
            <select
              name="shell_jacket_size"
              value={editedMember?.shell_jacket_size ?? ""}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            >
              <option value="XS">XS</option>
              <option value="S">S</option>
              <option value="M">M</option>
              <option value="L">L</option>
              <option value="XL">XL</option>
              <option value="XXL">XXL</option>
              <option value="XXXL">XXXL</option>
            </select>
            {validationErrors?.shell_jacket_size && (
              <p className="text-sm text-red-500">{validationErrors.shell_jacket_size}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">{t('personalInfo.hatSize')}</label>
            <select
              name="hat_size"
              value={editedMember?.hat_size ?? ""}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            >
              <option value="XS">XS</option>
              <option value="S">S</option>
              <option value="M">M</option>
              <option value="L">L</option>
              <option value="XL">XL</option>
              <option value="XXL">XXL</option>
              <option value="XXXL">XXXL</option>
            </select>
            {validationErrors?.hat_size && (
              <p className="text-sm text-red-500">{validationErrors.hat_size}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              {t('personalInfo.functionsInSocietyLabel')}
              <span className="text-xs text-gray-400 ml-1" title={t('personalInfo.functionsInSocietyTooltip')}>
                (?)
              </span>
            </label>
            <input
              type="text"
              name="functions_in_society"
              value={editedMember?.functions_in_society ?? ""}
              onChange={handleChange}
              placeholder={t('personalInfo.functionsInSocietyPlaceholder')}
              className="w-full p-2 border rounded"
              maxLength={250}
            />
          </div>

          {/* Skills Selector */}
          <div>
            <button
              type="button"
              onClick={() => setShowSkills(!showSkills)}
              className="mt-1 w-full flex justify-between items-center px-3 py-2 text-left border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <span>{t('skills.title')}</span>
              {showSkills ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
            {showSkills && (
              <div className="mt-2">
                {handleSkillsChange && (
                  <SkillsSelector
                    value={editedMember?.skills ?? []}
                    otherSkills={editedMember?.other_skills ?? ''}
                    onChange={(skills, other_skills) => handleSkillsChange?.({ skills, other_skills })}
                    isEditing={isEditing}
                  />
                )}
                <p className="text-xs text-gray-500 mt-1">
                  {t('skills.description')}
                </p>
              </div>
            )}
          </div>

          <EquipmentDeliverySection 
            member={member}
            onUpdate={onUpdate}
            onMemberUpdate={onMemberChange}
            isEditing={true}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default MemberBasicInfo;
