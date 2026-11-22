import { Icon } from "@iconify/react";

import addLinear from "@iconify-icons/solar/add-linear";
import altArrowLeftLinear from "@iconify-icons/solar/alt-arrow-left-linear";
import altArrowRightLinear from "@iconify-icons/solar/alt-arrow-right-linear";
import arrowLeftLinear from "@iconify-icons/solar/arrow-left-linear";
import arrowRightLinear from "@iconify-icons/solar/arrow-right-linear";
import arrowRightUpLinear from "@iconify-icons/solar/arrow-right-up-linear";
import bellLinear from "@iconify-icons/solar/bell-linear";
import bellOffLinear from "@iconify-icons/solar/bell-off-linear";
import book2Linear from "@iconify-icons/solar/book-2-linear";
import buildings2Linear from "@iconify-icons/solar/buildings-2-linear";
import calendarCloseLinear from "@iconify-icons/solar/calendar-close-linear";
import calendarLinear from "@iconify-icons/solar/calendar-linear";
import calendarMarkLinear from "@iconify-icons/solar/calendar-mark-linear";
import chatRoundDotsLinear from "@iconify-icons/solar/chat-round-dots-linear";
import checkLinear from "@iconify-icons/solar/check-linear";
import checkCircleLinear from "@iconify-icons/solar/check-circle-linear";
import checkReadLinear from "@iconify-icons/solar/check-read-linear";
import clockCircleLinear from "@iconify-icons/solar/clock-circle-linear";
import closeLinear from "@iconify-icons/solar/close-linear";
import compassLinear from "@iconify-icons/solar/compass-linear";
import dangerCircleLinear from "@iconify-icons/solar/danger-circle-linear";
import dangerTriangleLinear from "@iconify-icons/solar/danger-triangle-linear";
import documentTextLinear from "@iconify-icons/solar/document-text-linear";
import eyeClosedLinear from "@iconify-icons/solar/eye-closed-linear";
import eyeLinear from "@iconify-icons/solar/eye-linear";
import fileCheckLinear from "@iconify-icons/solar/file-check-linear";
import fileSearchLinear from "@iconify-icons/solar/file-search-linear";
import forbiddenCircleLinear from "@iconify-icons/solar/forbidden-circle-linear";
import infoCircleLinear from "@iconify-icons/solar/info-circle-linear";
import inboxLinear from "@iconify-icons/solar/inbox-linear";
import keyLinear from "@iconify-icons/solar/key-linear";
import logoutLinear from "@iconify-icons/solar/logout-linear";
import mapPointLinear from "@iconify-icons/solar/map-point-linear";
import megaphoneLinear from "@iconify-icons/solar/megaphone-linear";
import mentionCircleLinear from "@iconify-icons/solar/mention-circle-linear";
import refreshLinear from "@iconify-icons/solar/refresh-linear";
import shieldCheckLinear from "@iconify-icons/solar/shield-check-linear";
import squareAcademicCapLinear from "@iconify-icons/solar/square-academic-cap-linear";
import transferHorizontalLinear from "@iconify-icons/solar/transfer-horizontal-linear";
import userCheckRoundedLinear from "@iconify-icons/solar/user-check-rounded-linear";
import userIdLinear from "@iconify-icons/solar/user-id-linear";
import userRoundedLinear from "@iconify-icons/solar/user-rounded-linear";
import widget2Linear from "@iconify-icons/solar/widget-2-linear";

/*
  Solar Icons (linear), https://icon-sets.iconify.design/solar/
  Иконки собираются в бандл, без запросов к Iconify API.

  Обёртка сохраняет привычный интерфейс прежних иконок: size,
  className, aria-hidden. Толщина штриха у Solar фиксированная,
  поэтому strokeWidth принимается, но не используется.
*/

function createIcon(displayName, icon) {
  function SolarIcon({ size = 16, strokeWidth: _strokeWidth, ...props }) {
    const { "aria-hidden": ariaHidden = "true", ...rest } = props;
    return (
      <Icon
        icon={icon}
        width={size}
        height={size}
        aria-hidden={ariaHidden}
        focusable="false"
        {...rest}
      />
    );
  }

  SolarIcon.displayName = `Solar${displayName}`;
  return SolarIcon;
}

export const Plus = createIcon("Plus", addLinear);
export const ArrowLeft = createIcon("ArrowLeft", arrowLeftLinear);
export const ArrowRight = createIcon("ArrowRight", arrowRightLinear);
export const ArrowUpRight = createIcon("ArrowUpRight", arrowRightUpLinear);
export const ChevronLeft = createIcon("ChevronLeft", altArrowLeftLinear);
export const ChevronRight = createIcon("ChevronRight", altArrowRightLinear);
export const Bell = createIcon("Bell", bellLinear);
export const BellOff = createIcon("BellOff", bellOffLinear);
export const BookOpen = createIcon("BookOpen", book2Linear);
export const Building2 = createIcon("Building2", buildings2Linear);
export const CalendarOff = createIcon("CalendarOff", calendarCloseLinear);
export const CalendarDays = createIcon("CalendarDays", calendarLinear);
export const CalendarClock = createIcon("CalendarClock", calendarMarkLinear);
export const Check = createIcon("Check", checkLinear);
export const CircleCheck = createIcon("CircleCheck", checkCircleLinear);
export const CheckCheck = createIcon("CheckCheck", checkReadLinear);
export const Clock3 = createIcon("Clock3", clockCircleLinear);
export const X = createIcon("X", closeLinear);
export const Compass = createIcon("Compass", compassLinear);
export const CircleAlert = createIcon("CircleAlert", dangerCircleLinear);
export const TriangleAlert = createIcon("TriangleAlert", dangerTriangleLinear);
export const FileText = createIcon("FileText", documentTextLinear);
export const EyeOff = createIcon("EyeOff", eyeClosedLinear);
export const Eye = createIcon("Eye", eyeLinear);
export const FileCheck2 = createIcon("FileCheck2", fileCheckLinear);
export const FileSearch = createIcon("FileSearch", fileSearchLinear);
export const Ban = createIcon("Ban", forbiddenCircleLinear);
export const Info = createIcon("Info", infoCircleLinear);
export const Inbox = createIcon("Inbox", inboxLinear);
export const KeyRound = createIcon("KeyRound", keyLinear);
export const LogOut = createIcon("LogOut", logoutLinear);
export const MapPin = createIcon("MapPin", mapPointLinear);
export const Megaphone = createIcon("Megaphone", megaphoneLinear);
export const Messages = createIcon("Messages", chatRoundDotsLinear);
export const AtSign = createIcon("AtSign", mentionCircleLinear);
export const RefreshCw = createIcon("RefreshCw", refreshLinear);
export const ShieldCheck = createIcon("ShieldCheck", shieldCheckLinear);
export const GraduationCap = createIcon("GraduationCap", squareAcademicCapLinear);
export const ArrowLeftRight = createIcon("ArrowLeftRight", transferHorizontalLinear);
export const UserRoundCheck = createIcon("UserRoundCheck", userCheckRoundedLinear);
export const IdCard = createIcon("IdCard", userIdLinear);
export const UserRound = createIcon("UserRound", userRoundedLinear);
export const LayoutDashboard = createIcon("LayoutDashboard", widget2Linear);
