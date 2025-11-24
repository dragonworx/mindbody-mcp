/**
 * MinBody Public API v6 TypeScript Type Definitions
 * 
 * Auto-generated from official OpenAPI specification
 * Source: https://api.mindbodyonline.com/public/v6/swagger/doc
 * Generated: 2025-11-24
 * 
 * DO NOT EDIT MANUALLY - Regenerate from spec using generate-types.py
 */

// ============================================================================
// Core Appointment Types
// ============================================================================

/**
 * Contains information about an appointment.
 */
export interface Appointment {
  /** Any AddOns associated with the appointment */
  AddOns?: AddOnSmall[];
  /** The RSSID of the client who is booked for this appointment. */
  ClientId?: string;
  /** The ID of the pass on the client’s account that is to pay for this appointment. */
  ClientServiceId?: number;
  /** The duration of the appointment. */
  Duration?: number;
  /** The date and time the appointment is to end. */
  EndDateTime?: string;
  /** When `true`, indicates that this is the client’s first appointment at this site. */
  FirstAppointment?: boolean;
  /** The prefered gender of the appointment provider.  Possible values are: * None * Female * Male */
  GenderPreference?: "None" | "Female" | "Male";
  /** The unique ID of the appointment. */
  Id?: number;
  /** When `true`, indicates that the client should be added to a specific appointment waiting list. When `false`, the client should not be added to the waiting list. Default: *false* */
  IsWaitlist?: boolean;
  /** The ID of the location where this appointment is to take place. */
  LocationId?: number;
  /** Any notes associated with the appointment. */
  Notes?: string;
  /** Online Description associated with the appointment */
  OnlineDescription?: string;
  /** Optional external key for api partners. */
  PartnerExternalId?: string;
  /** The ID of the program to which this appointment belongs. */
  ProgramId?: number;
  /** If a user has Complementary and Alternative Medicine features enabled, this property indicates the provider assigned to the appointment. */
  ProviderId?: string;
  /** The resources this appointment is to use. */
  Resources?: ResourceSlim[];
  /** The ID of the session type of this appointment. */
  SessionTypeId?: number;
  /** Staff for the appointment */
  Staff?: AppointmentStaff;
  /** The ID of the staff member providing the service for this appointment. */
  StaffId?: number;
  /** When `true`, indicates that the staff member was requested specifically by the client. */
  StaffRequested?: boolean;
  /** The date and time the appointment is to start. */
  StartDateTime?: string;
  /** The status of this appointment. Possible values are: * None * Requested * Booked * Completed * Confirmed * Arrived * NoShow * Cancelled * LateCancelled */
  Status?: "None" | "Requested" | "Booked" | "Completed" | "Confirmed" | "Arrived" | "NoShow" | "Cancelled" | "LateCancelled";
  /** The unique ID of the appointment waitlist. */
  WaitlistEntryId?: number;
}

/**
 * An appointment
 */
export interface Appointment {
  /** The Add-Ons Associated with this appointment */
  AddOns?: AddOnSmall[];
  /** The RSSID of the client booked for this appointment. */
  ClientId?: string;
  /** The ID of the pass on the client's account that is paying for this appointment. */
  ClientServiceId?: number;
  /** Duration of appointment. */
  Duration?: number;
  /** The date and time the appointment will end. */
  EndDateTime?: string;
  /** Whether this is the client's first appointment at the site. */
  FirstAppointment?: boolean;
  /** Prefered gender of appointment. */
  GenderPreference?: string;
  /** The unique ID of the appointment. */
  Id?: number;
  /** Whether to add appointment to waitlist. */
  IsWaitlist?: boolean;
  /** The ID of the location where this appointment will take place. */
  LocationId?: number;
  /** The appointment notes. */
  Notes?: string;
  /** Online Description associated with the appointment */
  OnlineDescription?: string;
  /** Optional external key for api partners. */
  PartnerExternalId?: string;
  /** The ID of the program this appointment belongs to. */
  ProgramId?: number;
  /** If a user has Complementary and Alternative Medicine features enabled, this will allow a Provider ID to be assigned to an appointment. */
  ProviderId?: string;
  /** The resources this appointment is using. */
  Resources?: Resource[];
  /** The ID of the session type of this appointment. */
  SessionTypeId?: number;
  /** The ID of the staff member instructing this appointment. */
  StaffId?: number;
  /** Whether the staff member was requested specifically by the client. */
  StaffRequested?: boolean;
  /** The date and time the appointment will start. */
  StartDateTime?: string;
  /** The status of this appointment. */
  Status?: "Booked" | "Completed" | "Confirmed" | "Arrived" | "NoShow" | "Cancelled" | "LateCancelled";
  /** The ID of the appointment waitlist. */
  WaitlistEntryId?: number;
}

export interface AppointmentStaff {
  DisplayName?: string;
  FirstName?: string;
  Id?: number;
  LastName?: string;
}

export interface AddOnSmall {
  /** The unique ID of the appointment add-on booking. */
  Id?: number;
  /** The name of the appointment add-on. */
  Name?: string;
  /** The ID of the staff member providing the service for this add-on. */
  StaffId?: number;
  /** The ID of the session type of this appointment. */
  TypeId?: number;
}

/**
 * Contains information about resources, such as rooms.
 */
export interface ResourceSlim {
  /** The ID of the resource being used for this appointment. */
  Id?: number;
  /** The name of the resource being used for this appointment. */
  Name?: string;
}

/**
 * Get Staff Appointments Response Model
 */
export interface GetStaffAppointmentsResponse {
  /** Contains information about appointments and their details. */
  Appointments?: Appointment[];
  /** Contains information about the pagination used. */
  PaginationResponse?: PaginationResponse;
}

/**
 * Contains information about the pagination to use.
 */
export interface PaginationResponse {
  /** Number of results returned in this response */
  PageSize?: number;
  /** Limit from pagination request */
  RequestedLimit?: number;
  /** Offset from pagination request */
  RequestedOffset?: number;
  /** Total number of results in dataset */
  TotalResults?: number;
}

/**
 * Represents a request to add a new appointment, including details such as client information, appointment timing, location, and additional preferences.
 */
export interface AddAppointmentRequest {
  /** A unique identifier for tracking the AddAppointmentRequest. This ID is not stored and is used to match each request with its corresponding response. The request object will also be returned in the response, with the same ID value. - For single requests, this value will be ignored. - For multiple requests, if no value is provided, the system will generate an identifier ranging from 0 to (number of requests - 1). */
  AddAppointmentRequestId?: number;
  /** When `true`, indicates that a payment should be applied to the appointment.  <br />Default: **true** */
  ApplyPayment?: boolean;
  /** The RRSID of the client for whom the new appointment is being made. */
  ClientId: string;
  /** The duration of the appointment. This parameter is used to change the default duration of an appointment. */
  Duration?: number;
  /** The end date and time of the new appointment. <br /> Default: **StartDateTime**, offset by the staff member’s default appointment duration. */
  EndDateTime?: string;
  /** The action taken to add this appointment. Possible values are: confirm, unconfirm, arrive, unarrive, cancel, latecancel, complete. */
  Execute?: string;
  /** The client’s service provider gender preference. */
  GenderPreference?: string;
  /** Indicates whether to add an appointment request for review. If `true`, the appointment will be added as a request, bypassing the `IsWaitlist` parameter and two validations: 1. If a consumer is adding the appointment for another person. 2. If a staff member without permission to add appointments for other staff members is adding the appointment for another staff member.  This also allows anonymous calls (without an authentication token) to this endpoint. The `AllowClientsToBookAppointments` option must be disabled. If it is enabled and the `IsRequest` parameter is `true`, it will return an error.  For the appointment to be created as a request, one of the following conditions must also be met: - The call is anonymous (no authentication token provided). - The call is authenticated with a consumer token. - The authenticated user lacks permission to book appointments for other staff (`BookAppointmentsForAllStaff`) and is attempting to book for a different staff member.   - In this last case, if the `IsRequest` parameter is `true` and the authenticated user has the `BookAppointmentsForAllStaff` permission or is attempting to book the appointment for themselves,   the appointment will be created, but not as an appointment request.  If `false`, the appointment will follow the standard creation process, respecting the `IsWaitlist` parameter.  Default: `false` */
  IsRequest?: boolean;
  /** When `true`, indicates that the client should be added to a specific appointment waiting list. When `false`, the client should not be added to the waiting list. Default: **false** */
  IsWaitlist?: boolean;
  /** The ID of the location where the new appointment is to take place. */
  LocationId: number;
  /** Any general notes about this appointment. */
  Notes?: string;
  /** Optional external key for api partners. */
  PartnerExternalId?: string;
  /** If a user has Complementary and Alternative Medicine features enabled, this parameter assigns a provider ID to the appointment. */
  ProviderId?: string;
  /** A list of resource IDs to associate with the new appointment. */
  ResourceIds?: number[];
  /** Whether to send client an email for cancellations. An email is sent only if the client has an email address and automatic emails have been set up.  <br />Default: **false** */
  SendEmail?: boolean;
  /** The session type associated with the new appointment. */
  SessionTypeId: number;
  /** The ID of the staff member who is adding the new appointment. */
  StaffId: number;
  /** When `true`, indicates that the staff member was requested specifically by the client. */
  StaffRequested?: boolean;
  /** The start date and time of the new appointment. */
  StartDateTime: string;
  /** When true, indicates that the method is to be validated, but no new appointment data is added.  <br />Default: **false** */
  Test?: boolean;
}

export interface UpdateAppointmentRequest {
  /** When `true`, appointment will be updated with a current applicable client service from the clients account.  <br />Default: **false** */
  ApplyPayment?: boolean;
  /** A unique ID for the appointment. */
  AppointmentId: number;
  /** The end date and time of the new appointment.  <br />Default: **StartDateTime**, offset by the staff member’s default appointment duration. */
  EndDateTime?: string;
  /** The action taken to add this appointment. Possible values are: confirm, unconfirm, arrive, unarrive, cancel, latecancel, complete. */
  Execute?: string;
  /** The client’s service provider gender preference. */
  GenderPreference?: string;
  /** Any general notes about this appointment. */
  Notes?: string;
  /** Optional external key for api partners. */
  PartnerExternalId?: string;
  /** If a user has Complementary and Alternative Medicine features enabled, this parameter assigns a provider ID to the appointment. */
  ProviderId?: string;
  /** A list of resource IDs to associate with the new appointment. */
  ResourceIds?: number[];
  /** Whether to send client an email for cancellations. An email is sent only if the client has an email address and automatic emails have been set up.  <br />Default: **false** */
  SendEmail?: boolean;
  /** The session type associated with the new appointment. */
  SessionTypeId?: number;
  /** The ID of the staff member who is adding the new appointment. */
  StaffId?: number;
  /** The start date and time of the new appointment. */
  StartDateTime?: string;
  /** When `true`, indicates that the method is to be validated, but no new appointment data is added.  <br />Default: **false** */
  Test?: boolean;
}

export interface GetBookableItemsResponse {
  /** Contains information about the availabilities for appointment booking. */
  Availabilities?: Availability[];
  /** Contains information about the pagination used. */
  PaginationResponse?: PaginationResponse;
}

export interface Location {
  /** A list of URLs of any images associated with this location. */
  AdditionalImageURLs?: string[];
  /** The first line of the location’s street address. */
  Address?: string;
  /** A second address line for the location’s street address, if needed. */
  Address2?: string;
  /** A list of strings representing amenities available at the location. */
  Amenities?: Amenity[];
  /** The average rating for the location, out of five stars. */
  AverageRating?: number;
  /** The business description for the location, as configured by the business owner. */
  BusinessDescription?: string;
  /** The location’s city. */
  City?: string;
  /** A description of the location. */
  Description?: string;
  /** When `true`, indicates that classes are held at this location.<br /> When `false`, Indicates that classes are not held at this location. */
  HasClasses?: boolean;
  /** The ID assigned to this location. */
  Id?: number;
  /** The location’s latitude. */
  Latitude?: number;
  /** The location’s longitude. */
  Longitude?: number;
  /** The name of this location. */
  Name?: string;
  /** The location’s phone number. */
  Phone?: string;
  /** The location’s phone extension. */
  PhoneExtension?: string;
  /** The location’s postal code. */
  PostalCode?: string;
  /** The ID number assigned to this location. */
  SiteID?: number;
  /** The location’s state or province code. */
  StateProvCode?: string;
  /** A decimal representation of the location’s first tax rate. Tax properties are provided to apply all taxes to the purchase price that the purchase is subject to. Use as many tax properties as needed to represent all the taxes that apply in the location. Enter a decimal number that represents the appropriate tax rate. For example, for an 8% sales tax, enter 0.08. */
  Tax1?: number;
  /** A decimal representation of the location’s second tax rate. See the example in the description of Tax1. */
  Tax2?: number;
  /** A decimal representation of the location’s third tax rate. See the example in the description of Tax1. */
  Tax3?: number;
  /** A decimal representation of the location’s fourth tax rate. See the example in the description of Tax1. */
  Tax4?: number;
  /** A decimal representation of the location’s fifth tax rate. See the example in the description of Tax1. */
  Tax5?: number;
  /** The number of distinct introductory pricing options available for purchase at this location. */
  TotalNumberOfDeals?: number;
  /** The number of reviews that clients have left for this location. */
  TotalNumberOfRatings?: number;
}

/**
 * SessionType contains information about the session types in a business.
 */
export interface SessionType {
  /** This session type’s Add On Flag. */
  AvailableForAddOn?: boolean;
  /** This session type’s category. */
  Category?: string;
  /** This session type’s category ID. */
  CategoryId?: number;
  /** The default amount of time that a session of this type typically lasts. */
  DefaultTimeLength?: number;
  /** This session type’s unique ID. */
  Id?: number;
  /** The name of this session type. */
  Name?: string;
  /** The number of sessions that this session type deducts from the pricing option used to pay for this type of session. */
  NumDeducted?: number;
  /** The online description associated with the appointment. */
  OnlineDescription?: string;
  /** This session type’s service category ID. */
  ProgramId?: number;
  /** The amount of time that a session of this type will last for a specific Staff (when applicable.) */
  StaffTimeLength?: number;
  /** This session type’s subcategory. */
  Subcategory?: string;
  /** This session type’s subcategory ID. */
  SubcategoryId?: number;
  /** Contains the class description session type. Possible values are: * All * Class * Enrollment * Appointment * Resource * Media * Arrival */
  Type?: "All" | "Class" | "Enrollment" | "Appointment" | "Resource" | "Media" | "Arrival";
}

/**
 * The Staff
 */
export interface Staff {
  /** The address of the staff member who is teaching the class. */
  Address?: string;
  /** When `true`, indicates that the staff member can be scheduled for overlapping services.<br /> When `false`, indicates that the staff can only be scheduled for one service at a time in any given time-frame. */
  AlwaysAllowDoubleBooking?: boolean;
  /** When `true`, indicates that the staff member offers appointments.<br /> When `false`, indicates that the staff member does not offer appointments. */
  AppointmentInstructor?: boolean;
  /** A list of appointments for the staff. */
  Appointments?: Appointment[];
  /** A list of availabilities for the staff. */
  Availabilities?: Availability[];
  /** The staff member’s biography. This string contains HTML. */
  Bio?: string;
  /** The staff member’s city. */
  City?: string;
  /** Is the staff an assistant */
  ClassAssistant?: boolean;
  /** Is the staff an assistant2 */
  ClassAssistant2?: boolean;
  /** When `true`, indicates that the staff member can teach classes. When `false`, indicates that the staff member cannot teach classes. */
  ClassTeacher?: boolean;
  /** The staff member’s country. */
  Country?: string;
  /** The staff member’s Nickname. */
  DisplayName?: string;
  /** The staff member’s email address. */
  Email?: string;
  /** The EmpID assigned to the staff member. */
  EmpID?: string;
  /** The end date of employment */
  EmploymentEnd?: string;
  /** The start date of employment */
  EmploymentStart?: string;
  /** The staff member’s first name. */
  FirstName?: string;
  /** The staff member’s home phone number. */
  HomePhone?: string;
  /** The ID assigned to the staff member. */
  Id?: number;
  /** The URL of the staff member’s image, if one has been uploaded. */
  ImageUrl?: string;
  /** When `true`, indicates that the staff member is an independent contractor. When `false`, indicates that the staff member is not an independent contractor. */
  IndependentContractor?: boolean;
  /** When `true`, indicates that the staff member is male. When `false`, indicates that the staff member is female. */
  IsMale?: boolean;
  /** The staff member’s last name. */
  LastName?: string;
  /** The staff member’s mobile phone number. */
  MobilePhone?: string;
  /** The staff member’s name. */
  Name?: string;
  /** The staff member’s postal code. */
  PostalCode?: string;
  /** A list of ProviderIds for the staff. */
  ProviderIDs?: string[];
  /** return true if staff is sales Rep 1 else false. */
  Rep?: boolean;
  /** return true if staff is sales Rep 2 else false. */
  Rep2?: boolean;
  /** return true if staff is sales Rep 3 else false. */
  Rep3?: boolean;
  /** return true if staff is sales Rep 4 else false. */
  Rep4?: boolean;
  /** return true if staff is sales Rep 5 else false. */
  Rep5?: boolean;
  /** return true if staff is sales Rep 6 else false. */
  Rep6?: boolean;
  /** If configured by the business owner, this field determines a staff member’s weight when sorting. Use this field to sort staff members on your interface. */
  SortOrder?: number;
  /** This object contains the staff settings. */
  StaffSettings?: StaffSetting;
  /** The staff member’s state. */
  State?: string;
  /** A list of unavailabilities for the staff. */
  Unavailabilities?: Unavailability[];
  /** The staff member’s work phone number. */
  WorkPhone?: string;
}

export interface Program {
  /** The offset to use for the service category. */
  CancelOffset?: number;
  /** The content delivery platform(s) used by the service category. Possible values are: * InPerson * Livestream:Mindbody * Livestream:Other */
  ContentFormats?: string[];
  /** The service category’s ID. */
  Id?: number;
  /** The name of this service category. */
  Name?: string;
  /** Pricing relationships */
  PricingRelationships?: PricingRelationships;
  /** The service category’s schedule type. Possible values are: * All * Class * Enrollment * Appointment * Resource * Arrival */
  ScheduleType?: "All" | "Class" | "Enrollment" | "Appointment" | "Resource" | "Media" | "Arrival";
}

/**
 * The Client.
 */
export interface Client {
  /** The client’s current [account balance](https://mindbody-online-support.force.com/support/s/article/203262013-Adding-account-payments-video-tutorial?language=en_US). */
  AccountBalance?: number;
  /** The action taken. */
  Action?: "None" | "Added" | "Updated" | "Failed" | "Removed";
  /** When `true`, indicates that the client’s profile is marked as active on the site.<br /> When `false`, the client’s profile is inactive. Defaults to `true` based on the assumption that if a client is currently inactive OR is to be marked inactive, this property will explicitly be mapped/set to `false`. */
  Active?: boolean;
  /** The first line of the client’s street address. */
  AddressLine1?: string;
  /** The second line of the client’s street address, if needed. */
  AddressLine2?: string;
  /** The gender of staff member with whom the client prefers to book appointments. */
  AppointmentGenderPreference?: "None" | "Female" | "Male";
  /** The client’s date of birth. */
  BirthDate?: string;
  /** The client’s city. */
  City?: string;
  /** Contains information about the client’s credit card. */
  ClientCreditCard?: ClientCreditCard;
  /** Contains the IDs of the client’s assigned ClientIndexes and ClientIndexValues.  If an index is already assigned to the client, it is overwritten with the passed index value. You cannot currently remove client indexes using the Public API. Only the indexes passed in the request are returned in the response. */
  ClientIndexes?: AssignedClientIndex[];
  /** Contains information about the relationship between two clients.  This parameter does not include all of the relationships assigned to the client, only the ones passed in the request. */
  ClientRelationships?: ClientRelationship[];
  /** The client’s country. */
  Country?: string;
  /** The date the client’s profile was created and added to the business, either by the client from the online store, or by a staff member. This value always returns in the format `yyyy-mm-ddThh:mm:ss:ms`. */
  CreationDate?: string;
  /** Contains information about the custom fields used for clients in the business. */
  CustomClientFields?: CustomClientFieldValue[];
  /** The client’s email address. */
  Email?: string;
  /** The email address of the client’s emergency contact. */
  EmergencyContactInfoEmail?: string;
  /** The name of the client’s emergency contact. */
  EmergencyContactInfoName?: string;
  /** The phone number of the client’s emergency contact. */
  EmergencyContactInfoPhone?: string;
  /** The client’s relationship with the emergency contact. */
  EmergencyContactInfoRelationship?: string;
  /** The date of the client’s first booked appointment at the business. */
  FirstAppointmentDate?: string;
  /** The date of the clients first booked class at the business. */
  FirstClassDate?: string;
  /** The client’s first name. */
  FirstName?: string;
  /** The gender of the client. */
  Gender?: string;
  /** Information about the Home Location for this client */
  HomeLocation?: Location;
  /** The client’s home phone number. */
  HomePhone?: string;
  /** The client’s ID, as configured by the business owner. This is the client’s barcode ID if the business owner assigns barcodes to clients. This ID is used throughout the Public API for client-related Public API calls. When used in a POST `UpdateClient` request, the `Id` is used to identify the client for the update. */
  Id?: string;
  /** When `true`, indicates that the client should be marked as a company at the business.<br /> When `false`, indicates the client is an individual and does not represent a company. */
  IsCompany?: boolean;
  /** This value is set only if the business owner allows individuals to be prospects.<br /> When `true`, indicates that the client should be marked as a prospect for the business.<br /> When `false`, indicates that the client should not be marked as a prospect for the business. */
  IsProspect?: boolean;
  /** The last [formula note](https://support.mindbodyonline.com/s/article/203259903-Appointments-Formula-notes?language=en_US) entered for the client. */
  LastFormulaNotes?: string;
  /** The UTC date and time when the client’s information was last modified. */
  LastModifiedDateTime?: string;
  /** The client’s last name. */
  LastName?: string;
  /** Contains the client’s liability agreement information for the business. */
  Liability?: Liability;
  /** Passing `true` sets the client’s liability information as follows: * `IsReleased` is set to `true`. * `AgreementDate` is set to the time zone of the business when the call was processed. * `ReleasedBy` is set to `null` if the call is made by the client, `0` if the call was made by the business owner, or to a specific staff member’s ID if a staff member made the call. Passing `false` sets the client’s liability information as follows: * `IsReleased` is set to `false`. * `AgreementDate` is set to `null`. * `ReleasedBy` is set to `null`. */
  LiabilityRelease?: boolean;
  /** The clients locker number. */
  LockerNumber?: string;
  /** The ID of the [membership icon](https://support.mindbodyonline.com/s/article/203259703-Membership-Setup-screen?language=en_US) displayed next to the client’s name, if the client has a membership on their account. */
  MembershipIcon?: number;
  /** The client’s middle name. */
  MiddleName?: string;
  /** The client’s mobile phone number. */
  MobilePhone?: string;
  /** The client’s mobile provider. */
  MobileProvider?: number;
  /** Any notes entered on the client’s account by staff members. This value should never be shown to clients unless the business owner has a specific reason for showing them. */
  Notes?: string;
  /** The URL of the client’s photo for the client profile. */
  PhotoUrl?: string;
  /** The client’s postal code. */
  PostalCode?: string;
  /** Contains information about the client [prospect stage](https://support.mindbodyonline.com/s/article/206176457-Prospect-Stages?language=en_US). */
  ProspectStage?: ProspectStage;
  /** Contains any red alert information entered by the business owner for the client. */
  RedAlert?: string;
  /** Specifies how the client was referred to the business. You can get a list of possible strings using the `GetClientReferralTypes` endpoint. */
  ReferredBy?: string;
  /** A list of sales representatives. */
  SalesReps?: SalesRep[];
  /** When `true`, indicates that the client has opted to receive general account notifications by email. This property is editable.  <br />Default: **false** */
  SendAccountEmails?: boolean;
  /** When `true`, indicates that the client has opted to receive general account notifications by text message. This parameter cannot be updated by developers. If included in a request, it is ignored. */
  SendAccountTexts?: boolean;
  /** When `true`, indicates that the client has opted to receive promotional notifications by email. This property is editable.  <br />Default: **false** */
  SendPromotionalEmails?: boolean;
  /** When `true`, indicates that the client has opted to receive promotional notifications by text message. This parameter cannot be updated by developers. If included in a request, it is ignored. */
  SendPromotionalTexts?: boolean;
  /** When `true`, indicates that the client has opted to receive schedule notifications by email. This property is editable.  <br />Default: **false** */
  SendScheduleEmails?: boolean;
  /** When `true`, indicates that the client has opted to receive schedule notifications by text message. This parameter cannot be updated by developers. If included in a request, it is ignored. */
  SendScheduleTexts?: boolean;
  /** The client’s state. */
  State?: string;
  /** The status of the client in the business. Possible values are: * Declined * Non-Member * Active * Expired * Suspended * Terminated */
  Status?: string;
  /** The client’s system-generated ID at the business. This value cannot be changed by business owners and is always unique across all clients at the business. This ID is not widely used in the Public API, but can be used by your application to uniquely identify clients. */
  UniqueId?: number;
  /** The client’s work phone extension number. */
  WorkExtension?: string;
  /** The client’s work phone number. */
  WorkPhone?: string;
  /** Contains any yellow alert information entered by the business owner for the client. */
  YellowAlert?: string;
}


// ============================================================================
// Utility Types
// ============================================================================

/**
 * Generic paginated response wrapper
 */
export interface PaginatedResponse<T> {
  /** Array of results */
  Items?: T[];
  /** Pagination metadata */
  PaginationResponse?: PaginationResponse;
}

/**
 * Appointment response (uses "Appointments" key)
 */
export interface AppointmentResponse {
  Appointments?: Appointment[];
  PaginationResponse?: PaginationResponse;
}
