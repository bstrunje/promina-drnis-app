--
-- PostgreSQL database dump
--

-- Dumped from database version 17.0
-- Dumped by pg_dump version 17.0

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: members; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.members VALUES ('registered', '1912-12-12', '85274196300', '0989876543', 'Admin Town', 'Admin Street', 'admin@admin.com', 'Admin', 'User', 11, '$2b$10$Xt9k9fGtxOKGUu8bGMaTYO.wV0sQVcUUkneL/FIEbYWDoGMvtYPuC', 'admin', '2024-12-10 22:45:59.328369', DEFAULT, 'employed/unemployed', 'M', 'M', 0.00, 'female', true, NULL, NULL, 'regular', '2025-01-13 00:21:43.168124+01', '2025-01-13 00:21:43.168124+01');
INSERT INTO public.members VALUES ('pending', '1960-11-10', '55446655441', '0989875641', 'Novi grad', 'Nova ulica', 'novi@novi.com', 'Novi', 'User3', 18, NULL, 'member', NULL, DEFAULT, 'employed/unemployed', 'M', 'M', 0.00, 'male', false, NULL, NULL, 'regular', '2025-01-13 00:21:43.168124+01', '2025-01-13 00:21:43.168124+01');
INSERT INTO public.members VALUES ('registered', '1989-12-30', '12345678901', '+385981234567', 'Super Town', 'Super Street', 'super@super.com', 'Super', 'User', 13, '$2a$06$39KYj5fmJdYxTaMN8hfUJOKE4GtBOHGNqFP1uNcIWqDSq.0OpPxZ6', 'superuser', '2024-12-10 23:16:21.367374', DEFAULT, 'employed/unemployed', 'M', 'M', 0.00, 'female', true, NULL, NULL, 'regular', '2025-01-13 00:21:43.168124+01', '2025-01-13 00:21:43.168124+01');
INSERT INTO public.members VALUES ('registered', '1970-09-20', '78965412300', '0989876543', 'Perin Grad', 'Perina Ulica novi broj', 'pero@peric.com', 'Pero', 'Perić', 15, '$2b$10$lDGLgtMbe/YsQUD2esmcFOieYv8migK9VxhwFjbGF.NlMebbmd3aC', 'member', NULL, DEFAULT, 'employed/unemployed', 'M', 'M', 0.00, 'male', true, NULL, NULL, 'regular', '2025-01-13 00:21:43.168124+01', '2025-01-13 00:21:43.168124+01');
INSERT INTO public.members VALUES ('pending', '2007-07-07', '05566447788', '0987564321', 'Matin grad', 'Matina ulica 1', 'mate@mate.com', 'Mate', 'Matić', 19, NULL, 'member', NULL, DEFAULT, 'employed/unemployed', 'M', 'M', 0.00, 'male', false, NULL, NULL, 'regular', '2025-01-15 11:13:07.809867+01', '2025-01-15 11:13:07.809867+01');


--
-- Data for Name: Hours; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: activity_types; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.activity_types VALUES (1, 'ON-DUTY', 'Regular duty shifts and responsibilities', '2024-11-05 13:45:23.66999');
INSERT INTO public.activity_types VALUES (2, 'MEETINGS', 'Organizational meetings and gatherings', '2024-11-05 13:45:23.66999');
INSERT INTO public.activity_types VALUES (3, 'COMMUNITY_ACTION', 'Community service and volunteer work', '2024-11-05 13:45:23.66999');
INSERT INTO public.activity_types VALUES (4, 'TRAIL_ACTION', 'Trail maintenance and development work', '2024-11-05 13:45:23.66999');
INSERT INTO public.activity_types VALUES (5, 'TRIP_ORGANIZATION', 'Planning and conducting trips', '2024-11-05 13:45:23.66999');
INSERT INTO public.activity_types VALUES (6, 'TRIPS', 'Participation in mountaineering trips', '2024-11-05 13:45:23.66999');
INSERT INTO public.activity_types VALUES (7, 'MISCELLANEOUS', 'Other activities', '2024-11-05 13:45:23.66999');
INSERT INTO public.activity_types VALUES (8, 'hiking', 'Mountain hiking activities', '2024-11-16 01:47:02.814303');
INSERT INTO public.activity_types VALUES (9, 'climbing', 'Rock climbing activities', '2024-11-16 01:47:02.814303');
INSERT INTO public.activity_types VALUES (10, 'training', 'Training and educational activities', '2024-11-16 01:47:02.814303');
INSERT INTO public.activity_types VALUES (11, 'maintenance', 'Trail and equipment maintenance', '2024-11-16 01:47:02.814303');
INSERT INTO public.activity_types VALUES (12, 'social', 'Social gatherings and meetings', '2024-11-16 01:47:02.814303');


--
-- Data for Name: activities; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.activities VALUES (1, 'Mountain Hiking', 'Weekend hiking trip', '2024-11-01 08:00:00', '2024-11-01 16:00:00', 'Mountain Peak', 'moderate', 15, 1, '2024-10-29 11:35:56.390483', NULL);
INSERT INTO public.activities VALUES (2, 'Test Trail Maintenance', 'Testing the activity tracking system', '2024-11-05 00:00:00', '2024-11-05 03:00:00', NULL, NULL, NULL, NULL, '2024-11-05 14:09:00.051556', 4);
INSERT INTO public.activities VALUES (3, 'Test Meeting', 'Testing cumulative hours', '2024-11-05 00:00:00', '2024-11-05 02:00:00', NULL, NULL, NULL, NULL, '2024-11-05 14:25:18.973748', 2);


--
-- Data for Name: activity_participants; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.activity_participants VALUES (1, 1, 1, 8.00, 'participant', 'Completed full hike', 1, '2024-10-29 20:05:32.116776', NULL);
INSERT INTO public.activity_participants VALUES (3, 2, 2, 21.00, 'Participant', 'Testing automatic status calculation', NULL, NULL, NULL);
INSERT INTO public.activity_participants VALUES (4, 3, 2, 5.00, 'Attendee', 'Testing cumulative hours calculation', NULL, NULL, NULL);
INSERT INTO public.activity_participants VALUES (5, 3, 3, 15.00, 'Participant', 'Testing passive status calculation', NULL, NULL, NULL);


--
-- Data for Name: annual_statistics; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.audit_logs VALUES (5, 'LOGIN_SUCCESS', 11, 'Successful login: Admin User', '::ffff:127.0.0.1', '2024-12-11 02:21:18.261666', 'success', 11);
INSERT INTO public.audit_logs VALUES (56, 'LOGIN_SUCCESS', 13, 'Successful login: Super User', '::1', '2024-12-17 00:46:24.600935', 'success', 13);
INSERT INTO public.audit_logs VALUES (57, 'LOGIN_SUCCESS', 11, 'Successful login: Admin User', '::ffff:127.0.0.1', '2024-12-17 07:49:50.485135', 'success', 11);
INSERT INTO public.audit_logs VALUES (58, 'LOGIN_SUCCESS', 15, 'Successful login: Pero Peri─ç', '::ffff:127.0.0.1', '2024-12-17 08:16:14.317324', 'success', 15);
INSERT INTO public.audit_logs VALUES (59, 'ASSIGN_CARD_NUMBER', 13, 'Card number 11111 assigned to member 15', '::1', '2024-12-17 17:01:12.997479', 'success', 15);
INSERT INTO public.audit_logs VALUES (11, 'LOGIN_SUCCESS', 13, 'Successful login: Super User', '::ffff:127.0.0.1', '2024-12-11 17:11:01.81857', 'success', 13);
INSERT INTO public.audit_logs VALUES (12, 'LOGIN_SUCCESS', 11, 'Successful login: Admin User', '::1', '2024-12-11 18:10:47.047665', 'success', 11);
INSERT INTO public.audit_logs VALUES (13, 'ASSIGN_PASSWORD', 13, 'Password assigned for member 15', '::ffff:127.0.0.1', '2024-12-11 21:35:42.630155', 'success', 15);
INSERT INTO public.audit_logs VALUES (14, 'UPDATE_MEMBER_ROLE', 13, 'Updated member role: Admin User to admin', '::ffff:127.0.0.1', '2024-12-11 21:51:11.921446', 'success', 11);
INSERT INTO public.audit_logs VALUES (17, 'LOGIN_SUCCESS', 11, 'Successful login: Admin User', '::1', '2024-12-11 21:56:11.138748', 'success', 11);
INSERT INTO public.audit_logs VALUES (18, 'LOGIN_SUCCESS', 11, 'Successful login: Admin User', '::ffff:127.0.0.1', '2024-12-12 00:06:04.422771', 'success', 11);
INSERT INTO public.audit_logs VALUES (19, 'LOGIN_SUCCESS', 13, 'Successful login: Super User', '::ffff:127.0.0.1', '2024-12-12 00:06:50.155599', 'success', 13);
INSERT INTO public.audit_logs VALUES (20, 'UPDATE_MEMBER_ROLE', 13, 'Updated member role: Admin User to member', '::ffff:127.0.0.1', '2024-12-12 00:59:00.131481', 'success', 11);
INSERT INTO public.audit_logs VALUES (21, 'UPDATE_MEMBER_ROLE', 13, 'Updated member role: Pero Pero─ç to admin', '::ffff:127.0.0.1', '2024-12-12 01:06:55.7752', 'success', 15);
INSERT INTO public.audit_logs VALUES (22, 'UPDATE_MEMBER_ROLE', 13, 'Updated member role: Pero Pero─ç to member', '::ffff:127.0.0.1', '2024-12-12 01:08:08.572403', 'success', 15);
INSERT INTO public.audit_logs VALUES (23, 'UPDATE_MEMBER_ROLE', 13, 'Updated member role: Pero Pero─ç to admin', '::ffff:127.0.0.1', '2024-12-12 01:09:51.981153', 'success', 15);
INSERT INTO public.audit_logs VALUES (24, 'UPDATE_MEMBER_ROLE', 13, 'Updated member role: Pero Pero─ç to member', '::ffff:127.0.0.1', '2024-12-12 01:10:13.35047', 'success', 15);
INSERT INTO public.audit_logs VALUES (25, 'LOGIN_SUCCESS', 15, 'Successful login: Pero Pero─ç', '::1', '2024-12-12 11:35:45.068301', 'success', 15);
INSERT INTO public.audit_logs VALUES (26, 'LOGIN_SUCCESS', 11, 'Successful login: Admin User', '::1', '2024-12-12 11:38:14.148817', 'success', 11);
INSERT INTO public.audit_logs VALUES (27, 'UPDATE_MEMBER_ROLE', 13, 'Updated member role: Admin User to admin', '::ffff:127.0.0.1', '2024-12-12 11:38:57.985655', 'success', 11);
INSERT INTO public.audit_logs VALUES (28, 'LOGIN_SUCCESS', 11, 'Successful login: Admin User', '::1', '2024-12-12 11:39:56.286448', 'success', 11);
INSERT INTO public.audit_logs VALUES (29, 'LOGIN_SUCCESS', 15, 'Successful login: Pero Pero─ç', '::1', '2024-12-12 17:43:50.30237', 'success', 15);
INSERT INTO public.audit_logs VALUES (30, 'LOGIN_SUCCESS', 13, 'Successful login: Super User', '::1', '2024-12-12 21:45:41.198658', 'success', 13);
INSERT INTO public.audit_logs VALUES (31, 'LOGIN_SUCCESS', 11, 'Successful login: Admin User', '::1', '2024-12-13 10:17:01.715909', 'success', 11);
INSERT INTO public.audit_logs VALUES (32, 'LOGIN_SUCCESS', 15, 'Successful login: Pero Pero─ç', '::1', '2024-12-13 18:58:41.723164', 'success', 15);
INSERT INTO public.audit_logs VALUES (33, 'LOGIN_SUCCESS', 13, 'Successful login: Super User', '::1', '2024-12-13 19:17:06.546192', 'success', 13);
INSERT INTO public.audit_logs VALUES (34, 'LOGIN_SUCCESS', 15, 'Successful login: Pero Pero─ç', '::ffff:127.0.0.1', '2024-12-13 22:38:00.213136', 'success', 15);
INSERT INTO public.audit_logs VALUES (35, 'CREATE_MESSAGE', 15, 'Message created by member 15', '::ffff:127.0.0.1', '2024-12-14 01:00:20.990872', 'success', NULL);
INSERT INTO public.audit_logs VALUES (36, 'CREATE_MESSAGE', 15, 'Message created by member 15', '::ffff:127.0.0.1', '2024-12-14 01:02:14.865331', 'success', NULL);
INSERT INTO public.audit_logs VALUES (37, 'LOGIN_SUCCESS', 11, 'Successful login: Admin User', '::1', '2024-12-14 08:38:14.744833', 'success', 11);
INSERT INTO public.audit_logs VALUES (38, 'LOGIN_SUCCESS', 13, 'Successful login: Super User', '::1', '2024-12-14 21:00:23.919945', 'success', 13);
INSERT INTO public.audit_logs VALUES (39, 'LOGIN_SUCCESS', 15, 'Successful login: Pero Pero─ç', '::ffff:127.0.0.1', '2024-12-15 01:45:07.147925', 'success', 15);
INSERT INTO public.audit_logs VALUES (40, 'LOGIN_SUCCESS', 11, 'Successful login: Admin User', '::1', '2024-12-15 19:40:09.982314', 'success', 11);
INSERT INTO public.audit_logs VALUES (41, 'ASSIGN_CARD_NUMBER', 11, 'Card number 11111 assigned to member 15', '::1', '2024-12-15 20:54:32.360289', 'success', 15);
INSERT INTO public.audit_logs VALUES (42, 'ASSIGN_CARD_NUMBER', 11, 'Card number 11111 assigned to member 15', '::1', '2024-12-15 20:55:04.067098', 'success', 15);
INSERT INTO public.audit_logs VALUES (43, 'ASSIGN_CARD_NUMBER', 11, 'Card number 11111 assigned to member 15', '::1', '2024-12-15 20:55:53.276983', 'success', 15);
INSERT INTO public.audit_logs VALUES (44, 'LOGIN_SUCCESS', 13, 'Successful login: Super User', '::1', '2024-12-15 21:34:14.779641', 'success', 13);
INSERT INTO public.audit_logs VALUES (45, 'ASSIGN_CARD_NUMBER', 13, 'Card number 11111 assigned to member 15', '::1', '2024-12-15 21:37:28.757698', 'success', 15);
INSERT INTO public.audit_logs VALUES (46, 'ASSIGN_CARD_NUMBER', 13, 'Card number 12345 assigned to member 15', '::1', '2024-12-15 21:38:47.520026', 'success', 15);
INSERT INTO public.audit_logs VALUES (47, 'UPDATE_MEMBER', 11, 'Updated member: Pero Peri─ç', '::1', '2024-12-15 22:40:37.020082', 'success', 15);
INSERT INTO public.audit_logs VALUES (48, 'LOGIN_SUCCESS', 15, 'Successful login: Pero Peri─ç', '::ffff:127.0.0.1', '2024-12-15 23:04:31.809161', 'success', 15);
INSERT INTO public.audit_logs VALUES (49, 'LOGIN_SUCCESS', 15, 'Successful login: Pero Peri─ç', '::ffff:127.0.0.1', '2024-12-15 23:34:51.60878', 'success', 15);
INSERT INTO public.audit_logs VALUES (50, 'LOGIN_SUCCESS', 11, 'Successful login: Admin User', '::ffff:127.0.0.1', '2024-12-16 00:11:54.961837', 'success', 11);
INSERT INTO public.audit_logs VALUES (51, 'ASSIGN_CARD_NUMBER', 11, 'Card number 11111 assigned to member 15', '::1', '2024-12-16 00:51:41.044589', 'success', 15);
INSERT INTO public.audit_logs VALUES (52, 'LOGIN_SUCCESS', 11, 'Successful login: Admin User', '::ffff:127.0.0.1', '2024-12-16 02:17:41.769587', 'success', 11);
INSERT INTO public.audit_logs VALUES (53, 'ASSIGN_CARD_NUMBER', 11, 'Card number 11111 assigned to member 15', '::1', '2024-12-16 02:19:37.78298', 'success', 15);
INSERT INTO public.audit_logs VALUES (54, 'UPDATE_MEMBER', 11, 'Updated member: Pero Peri─ç', '::ffff:127.0.0.1', '2024-12-16 02:19:55.041185', 'success', 15);
INSERT INTO public.audit_logs VALUES (55, 'LOGIN_SUCCESS', 13, 'Successful login: Super User', '::1', '2024-12-17 00:34:06.161061', 'success', 13);
INSERT INTO public.audit_logs VALUES (62, 'LOGIN_SUCCESS', 15, 'Successful login: Pero Peri─ç', '::ffff:127.0.0.1', '2024-12-17 21:10:33.50247', 'success', 15);
INSERT INTO public.audit_logs VALUES (63, 'CREATE_MESSAGE', 15, 'Message created by member 15', '::ffff:127.0.0.1', '2024-12-17 22:43:51.637824', 'success', NULL);
INSERT INTO public.audit_logs VALUES (64, 'CREATE_MESSAGE', 15, 'Message created by member 15', '::ffff:127.0.0.1', '2024-12-17 22:45:17.03302', 'success', NULL);
INSERT INTO public.audit_logs VALUES (65, 'CREATE_MESSAGE', 15, 'Message created by member 15', '::ffff:127.0.0.1', '2024-12-17 22:46:56.177084', 'success', NULL);
INSERT INTO public.audit_logs VALUES (66, 'CREATE_MESSAGE', 15, 'Message created by member 15', '::ffff:127.0.0.1', '2024-12-17 22:48:12.668385', 'success', NULL);
INSERT INTO public.audit_logs VALUES (67, 'CREATE_MESSAGE', 15, 'Message created by member 15', '::ffff:127.0.0.1', '2024-12-17 23:22:24.889553', 'success', NULL);
INSERT INTO public.audit_logs VALUES (68, 'LOGIN_SUCCESS', 11, 'Successful login: Admin User', '::1', '2024-12-17 23:23:30.452396', 'success', 11);
INSERT INTO public.audit_logs VALUES (69, 'CREATE_MESSAGE', 15, 'Message created by member 15', '::ffff:127.0.0.1', '2024-12-18 00:23:25.184508', 'success', NULL);
INSERT INTO public.audit_logs VALUES (70, 'CREATE_MESSAGE', 15, 'Message created by member 15', '::ffff:127.0.0.1', '2024-12-18 00:38:16.77409', 'success', NULL);
INSERT INTO public.audit_logs VALUES (71, 'LOGIN_SUCCESS', 11, 'Successful login: Admin User', '::1', '2024-12-18 00:39:40.579482', 'success', 11);
INSERT INTO public.audit_logs VALUES (72, 'CREATE_MESSAGE', 15, 'Message created by member 15', '::ffff:127.0.0.1', '2024-12-18 00:46:00.75172', 'success', NULL);
INSERT INTO public.audit_logs VALUES (73, 'LOGIN_SUCCESS', 13, 'Successful login: Super User', '::1', '2024-12-18 00:50:30.963249', 'success', 13);
INSERT INTO public.audit_logs VALUES (74, 'LOGIN_SUCCESS', 11, 'Successful login: Admin User', '::1', '2024-12-18 00:52:57.958516', 'success', 11);
INSERT INTO public.audit_logs VALUES (75, 'CREATE_MESSAGE', 15, 'Message created by member 15', '::ffff:127.0.0.1', '2024-12-18 00:53:45.326277', 'success', NULL);
INSERT INTO public.audit_logs VALUES (76, 'MARK_MESSAGE_READ', 13, 'Message 11 marked as read', '::1', '2024-12-18 01:14:29.406609', 'success', NULL);
INSERT INTO public.audit_logs VALUES (77, 'MARK_MESSAGE_READ', 13, 'Message 10 marked as read', '::1', '2024-12-18 01:14:32.75508', 'success', NULL);
INSERT INTO public.audit_logs VALUES (78, 'MARK_MESSAGE_READ', 13, 'Message 9 marked as read', '::1', '2024-12-18 01:14:34.300135', 'success', NULL);
INSERT INTO public.audit_logs VALUES (79, 'MARK_MESSAGE_READ', 13, 'Message 8 marked as read', '::1', '2024-12-18 01:14:38.168071', 'success', NULL);
INSERT INTO public.audit_logs VALUES (80, 'MARK_MESSAGE_READ', 13, 'Message 7 marked as read', '::1', '2024-12-18 01:14:40.488048', 'success', NULL);
INSERT INTO public.audit_logs VALUES (81, 'MARK_MESSAGE_READ', 13, 'Message 6 marked as read', '::1', '2024-12-18 01:14:42.507798', 'success', NULL);
INSERT INTO public.audit_logs VALUES (82, 'ARCHIVE_MESSAGE', 13, 'Message 11 archived', '::1', '2024-12-18 01:14:52.160568', 'success', NULL);
INSERT INTO public.audit_logs VALUES (83, 'ARCHIVE_MESSAGE', 13, 'Message 10 archived', '::1', '2024-12-18 01:14:54.659067', 'success', NULL);
INSERT INTO public.audit_logs VALUES (84, 'CREATE_MESSAGE', 15, 'Message created by member 15', '::ffff:127.0.0.1', '2024-12-18 01:34:14.032752', 'success', NULL);
INSERT INTO public.audit_logs VALUES (85, 'MARK_MESSAGE_READ', 11, 'Message 1 marked as read', '::1', '2024-12-18 01:36:28.621069', 'success', NULL);
INSERT INTO public.audit_logs VALUES (86, 'ARCHIVE_MESSAGE', 11, 'Message 1 archived', '::1', '2024-12-18 01:36:29.896282', 'success', NULL);
INSERT INTO public.audit_logs VALUES (87, 'CREATE_MESSAGE', 15, 'Message created by member 15', '::ffff:127.0.0.1', '2024-12-18 01:38:15.305611', 'success', NULL);
INSERT INTO public.audit_logs VALUES (88, 'MARK_MESSAGE_READ', 11, 'Message 13 marked as read', '::1', '2024-12-18 01:39:11.328892', 'success', NULL);
INSERT INTO public.audit_logs VALUES (89, 'MARK_MESSAGE_READ', 11, 'Message 12 marked as read', '::1', '2024-12-18 01:39:12.37569', 'success', NULL);
INSERT INTO public.audit_logs VALUES (90, 'MARK_MESSAGE_READ', 11, 'Message 5 marked as read', '::1', '2024-12-18 01:39:15.613796', 'success', NULL);
INSERT INTO public.audit_logs VALUES (91, 'MARK_MESSAGE_READ', 11, 'Message 4 marked as read', '::1', '2024-12-18 01:39:16.672379', 'success', NULL);
INSERT INTO public.audit_logs VALUES (92, 'MARK_MESSAGE_READ', 11, 'Message 3 marked as read', '::1', '2024-12-18 01:39:17.760943', 'success', NULL);
INSERT INTO public.audit_logs VALUES (93, 'MARK_MESSAGE_READ', 11, 'Message 2 marked as read', '::1', '2024-12-18 01:39:20.045919', 'success', NULL);
INSERT INTO public.audit_logs VALUES (94, 'ARCHIVE_MESSAGE', 11, 'Message 13 archived', '::1', '2024-12-18 01:39:49.019413', 'success', NULL);
INSERT INTO public.audit_logs VALUES (95, 'ARCHIVE_MESSAGE', 11, 'Message 12 archived', '::1', '2024-12-18 01:39:53.65665', 'success', NULL);
INSERT INTO public.audit_logs VALUES (96, 'ARCHIVE_MESSAGE', 11, 'Message 9 archived', '::1', '2024-12-18 01:39:55.915539', 'success', NULL);
INSERT INTO public.audit_logs VALUES (97, 'ARCHIVE_MESSAGE', 11, 'Message 8 archived', '::1', '2024-12-18 01:40:07.542669', 'success', NULL);
INSERT INTO public.audit_logs VALUES (98, 'ARCHIVE_MESSAGE', 11, 'Message 7 archived', '::1', '2024-12-18 01:40:08.855654', 'success', NULL);
INSERT INTO public.audit_logs VALUES (99, 'ARCHIVE_MESSAGE', 11, 'Message 6 archived', '::1', '2024-12-18 01:40:10.075712', 'success', NULL);
INSERT INTO public.audit_logs VALUES (100, 'ARCHIVE_MESSAGE', 11, 'Message 5 archived', '::1', '2024-12-18 01:44:23.048645', 'success', NULL);
INSERT INTO public.audit_logs VALUES (101, 'ARCHIVE_MESSAGE', 11, 'Message 4 archived', '::1', '2024-12-18 01:44:25.358819', 'success', NULL);
INSERT INTO public.audit_logs VALUES (102, 'ARCHIVE_MESSAGE', 11, 'Message 3 archived', '::1', '2024-12-18 01:44:26.537144', 'success', NULL);
INSERT INTO public.audit_logs VALUES (103, 'ARCHIVE_MESSAGE', 11, 'Message 2 archived', '::1', '2024-12-18 01:44:27.526192', 'success', NULL);
INSERT INTO public.audit_logs VALUES (104, 'LOGIN_SUCCESS', 11, 'Successful login: Admin User', '::1', '2024-12-18 01:52:33.264542', 'success', 11);
INSERT INTO public.audit_logs VALUES (105, 'LOGIN_SUCCESS', 13, 'Successful login: Super User', '::1', '2024-12-18 08:47:40.75682', 'success', 13);
INSERT INTO public.audit_logs VALUES (106, 'DELETE_MESSAGE', 13, 'Message 12 deleted', '::1', '2024-12-18 09:13:01.238371', 'success', NULL);
INSERT INTO public.audit_logs VALUES (107, 'DELETE_MESSAGE', 13, 'Message 13 deleted', '::1', '2024-12-18 09:13:38.298105', 'success', NULL);
INSERT INTO public.audit_logs VALUES (108, 'DELETE_ALL_MESSAGES', 13, 'All messages deleted', '::1', '2024-12-18 09:14:54.709026', 'success', NULL);
INSERT INTO public.audit_logs VALUES (109, 'CREATE_MESSAGE', 15, 'Message created by member 15', '::ffff:127.0.0.1', '2024-12-18 09:20:05.860379', 'success', NULL);
INSERT INTO public.audit_logs VALUES (110, 'CREATE_MESSAGE', 15, 'Message created by member 15', '::ffff:127.0.0.1', '2024-12-18 09:20:48.283167', 'success', NULL);
INSERT INTO public.audit_logs VALUES (111, 'CREATE_MESSAGE', 15, 'Message created by member 15', '::ffff:127.0.0.1', '2024-12-18 09:20:57.614845', 'success', NULL);
INSERT INTO public.audit_logs VALUES (112, 'LOGIN_SUCCESS', 11, 'Successful login: Admin User', '::1', '2024-12-18 09:21:39.696848', 'success', 11);
INSERT INTO public.audit_logs VALUES (113, 'MARK_MESSAGE_READ', 11, 'Message 14 marked as read', '::1', '2024-12-18 09:26:16.545986', 'success', NULL);
INSERT INTO public.audit_logs VALUES (114, 'ARCHIVE_MESSAGE', 11, 'Message 14 archived', '::1', '2024-12-18 09:26:34.542333', 'success', NULL);
INSERT INTO public.audit_logs VALUES (115, 'DELETE_MESSAGE', 13, 'Message 14 deleted', '::1', '2024-12-18 09:26:59.712119', 'success', NULL);
INSERT INTO public.audit_logs VALUES (116, 'DELETE_ALL_MESSAGES', 13, 'All messages deleted', '::1', '2024-12-18 09:27:12.01123', 'success', NULL);
INSERT INTO public.audit_logs VALUES (117, 'LOGIN_SUCCESS', 15, 'Successful login: Pero Peri─ç', '::ffff:127.0.0.1', '2024-12-18 14:39:13.957417', 'success', 15);
INSERT INTO public.audit_logs VALUES (118, 'UPDATE_MEMBERSHIP', 13, 'Membership fee payment updated for member 15', '::1', '2024-12-18 14:40:59.177654', 'success', 15);
INSERT INTO public.audit_logs VALUES (119, 'UPDATE_MEMBER', 13, 'Updated member: Pero Peri─ç', '::1', '2024-12-18 14:41:15.205201', 'success', 15);
INSERT INTO public.audit_logs VALUES (120, 'ASSIGN_CARD_NUMBER', 13, 'Card number 11111 assigned to member 15', '::1', '2024-12-18 14:42:05.232061', 'success', 15);
INSERT INTO public.audit_logs VALUES (121, 'ASSIGN_CARD_NUMBER', 13, 'Card number 11111 assigned to member 15', '::1', '2024-12-18 14:49:28.152197', 'success', 15);
INSERT INTO public.audit_logs VALUES (122, 'CREATE_MESSAGE', 13, 'Message created by member 13', '::1', '2024-12-18 18:29:18.065223', 'success', NULL);
INSERT INTO public.audit_logs VALUES (123, 'DELETE_MESSAGE', 13, 'Message 17 deleted', '::1', '2024-12-18 18:29:39.12037', 'success', NULL);
INSERT INTO public.audit_logs VALUES (124, 'ASSIGN_CARD_NUMBER', 13, 'Card number 11111 assigned to member 15', '::1', '2024-12-18 18:48:26.411864', 'success', 15);
INSERT INTO public.audit_logs VALUES (125, 'LOGIN_SUCCESS', 15, 'Successful login: Pero Peri─ç', '::ffff:127.0.0.1', '2024-12-18 19:01:39.248743', 'success', 15);
INSERT INTO public.audit_logs VALUES (126, 'UPDATE_MEMBERSHIP', 13, 'Membership fee payment updated for member 13', '::1', '2024-12-18 19:03:09.794888', 'success', 13);
INSERT INTO public.audit_logs VALUES (127, 'ASSIGN_CARD_NUMBER', 13, 'Card number 12345 assigned to member 13', '::1', '2024-12-18 19:03:46.971669', 'success', 13);
INSERT INTO public.audit_logs VALUES (128, 'ASSIGN_CARD_NUMBER', 11, 'Card number 11111 assigned to member 15', '::1', '2024-12-18 19:14:40.902248', 'success', 15);
INSERT INTO public.audit_logs VALUES (129, 'ASSIGN_CARD_NUMBER', 11, 'Card number 1111 assigned to member 15', '::1', '2024-12-18 19:15:41.818919', 'success', 15);
INSERT INTO public.audit_logs VALUES (130, 'UPDATE_MEMBER', 11, 'Updated member: Pero Peri─ç', '::1', '2024-12-18 19:16:06.150216', 'success', 15);
INSERT INTO public.audit_logs VALUES (131, 'ASSIGN_CARD_NUMBER', 11, 'Card number 11111 assigned to member 15', '::1', '2024-12-18 19:19:50.655933', 'success', 15);
INSERT INTO public.audit_logs VALUES (132, 'ASSIGN_CARD_NUMBER', 11, 'Card number 11112 assigned to member 15', '::1', '2024-12-18 19:21:34.969178', 'success', 15);
INSERT INTO public.audit_logs VALUES (133, 'ASSIGN_CARD_NUMBER', 11, 'Card number 11222 assigned to member 15', '::1', '2024-12-18 19:34:09.156762', 'success', 15);
INSERT INTO public.audit_logs VALUES (134, 'ASSIGN_CARD_NUMBER', 11, 'Card number 11111 assigned to member 15', '::1', '2024-12-18 19:35:11.344356', 'success', 15);
INSERT INTO public.audit_logs VALUES (135, 'UPDATE_MEMBER', 11, 'Updated member: Pero Peri─ç', '::1', '2024-12-18 19:35:30.759694', 'success', 15);
INSERT INTO public.audit_logs VALUES (136, 'ASSIGN_CARD_NUMBER', 11, 'Card number 1 assigned to member 15', '::1', '2024-12-18 19:37:56.176889', 'success', 15);
INSERT INTO public.audit_logs VALUES (137, 'ASSIGN_CARD_NUMBER', 11, 'Card number 22222 assigned to member 15', '::1', '2024-12-18 19:40:45.123134', 'success', 15);
INSERT INTO public.audit_logs VALUES (138, 'UPDATE_MEMBER', 11, 'Updated member: Pero Peri─ç', '::1', '2024-12-18 19:40:48.499403', 'success', 15);
INSERT INTO public.audit_logs VALUES (139, 'UPDATE_MEMBERSHIP', 11, 'Membership fee payment updated for member 15', '::1', '2024-12-18 20:04:45.812443', 'success', 15);
INSERT INTO public.audit_logs VALUES (140, 'ASSIGN_CARD_NUMBER', 11, 'Card number 11111 assigned to member 15', '::1', '2024-12-18 20:11:50.299182', 'success', 15);
INSERT INTO public.audit_logs VALUES (141, 'UPDATE_MEMBER', 11, 'Updated member: Pero Peri─ç', '::1', '2024-12-18 20:12:01.367408', 'success', 15);
INSERT INTO public.audit_logs VALUES (142, 'UPDATE_MEMBER', 13, 'Updated member: Super User', '::1', '2024-12-19 00:26:04.324429', 'success', 13);
INSERT INTO public.audit_logs VALUES (143, 'CREATE_MESSAGE', 13, 'Message created by member 13', '::1', '2024-12-19 00:43:55.020474', 'success', NULL);
INSERT INTO public.audit_logs VALUES (144, 'ASSIGN_CARD_NUMBER', 13, 'Card number 11111 assigned to member 15', '::1', '2024-12-19 01:13:12.130642', 'success', 15);
INSERT INTO public.audit_logs VALUES (145, 'LOGIN_SUCCESS', 11, 'Successful login: Admin User', '::1', '2024-12-19 01:42:11.985652', 'success', 11);
INSERT INTO public.audit_logs VALUES (146, 'LOGIN_SUCCESS', 13, 'Successful login: Super User', '::1', '2024-12-19 01:42:56.401641', 'success', 13);
INSERT INTO public.audit_logs VALUES (147, 'UPDATE_MEMBER', 13, 'Updated member: Super User', '::1', '2024-12-19 01:43:08.745233', 'success', 13);
INSERT INTO public.audit_logs VALUES (148, 'DELETE_MESSAGE', 13, 'Message 18 deleted', '::1', '2024-12-19 10:03:26.481442', 'success', NULL);
INSERT INTO public.audit_logs VALUES (149, 'ASSIGN_CARD_NUMBER', 13, 'Card number 11222 assigned to member 15', '::1', '2024-12-19 10:04:48.98106', 'success', 15);
INSERT INTO public.audit_logs VALUES (150, 'UPDATE_MEMBER', 13, 'Updated member: Pero Peri─ç', '::1', '2024-12-19 10:05:25.057435', 'success', 15);
INSERT INTO public.audit_logs VALUES (151, 'LOGIN_SUCCESS', 13, 'Successful login: Super User', '::1', '2024-12-20 01:41:05.925235', 'success', 13);
INSERT INTO public.audit_logs VALUES (152, 'ASSIGN_CARD_NUMBER', 13, 'Card number 11111 assigned to member 15', '::1', '2024-12-20 01:43:11.936918', 'success', 15);
INSERT INTO public.audit_logs VALUES (153, 'CREATE_MESSAGE', 13, 'Message created by member 13', '::1', '2024-12-20 01:43:54.244067', 'success', NULL);
INSERT INTO public.audit_logs VALUES (154, 'DELETE_MESSAGE', 13, 'Message 19 deleted', '::1', '2024-12-20 01:44:13.697223', 'success', NULL);
INSERT INTO public.audit_logs VALUES (157, 'LOGIN_SUCCESS', 13, 'Successful login: Super User', '::1', '2024-12-20 16:15:32.021813', 'success', 13);
INSERT INTO public.audit_logs VALUES (160, 'LOGIN_SUCCESS', 11, 'Successful login: Admin User', '::1', '2024-12-20 16:22:30.133533', 'success', 11);
INSERT INTO public.audit_logs VALUES (161, 'LOGIN_SUCCESS', 13, 'Successful login: Super User', '::1', '2024-12-20 18:08:13.73639', 'success', 13);
INSERT INTO public.audit_logs VALUES (162, 'MEMBERSHIP_FEE_PAYMENT', 15, 'Membership fee paid for 1996', '::1', '2024-12-20 18:55:02.262783', 'success', NULL);
INSERT INTO public.audit_logs VALUES (163, 'UPDATE_MEMBERSHIP', 13, 'Membership fee payment updated for member 15', '::1', '2024-12-20 18:55:02.265039', 'success', 15);
INSERT INTO public.audit_logs VALUES (164, 'UPDATE_MEMBER', 13, 'Updated member: Pero Peri─ç', '::1', '2024-12-20 19:01:58.898459', 'success', 15);
INSERT INTO public.audit_logs VALUES (165, 'LOGIN_SUCCESS', 11, 'Successful login: Admin User', '::ffff:127.0.0.1', '2024-12-20 19:03:07.870473', 'success', 11);
INSERT INTO public.audit_logs VALUES (166, 'UPDATE_MEMBER', 11, 'Updated member: Pero Peri─ç', '::ffff:127.0.0.1', '2024-12-20 19:04:25.070552', 'success', 15);
INSERT INTO public.audit_logs VALUES (167, 'MEMBERSHIP_FEE_PAYMENT', 15, 'Membership fee paid for 1997', '::1', '2024-12-20 19:52:27.276879', 'success', NULL);
INSERT INTO public.audit_logs VALUES (168, 'UPDATE_MEMBERSHIP', 11, 'Membership fee payment updated for member 15', '::1', '2024-12-20 19:52:27.279062', 'success', 15);
INSERT INTO public.audit_logs VALUES (169, 'UPDATE_MEMBER', 11, 'Updated member: Pero Peri─ç', '::1', '2024-12-20 19:52:36.128084', 'success', 15);
INSERT INTO public.audit_logs VALUES (170, 'MEMBERSHIP_FEE_PAYMENT', 15, 'Membership fee paid for 1995', '::1', '2024-12-20 20:04:41.460116', 'success', NULL);
INSERT INTO public.audit_logs VALUES (171, 'UPDATE_MEMBERSHIP', 11, 'Membership fee payment updated for member 15', '::1', '2024-12-20 20:04:41.463504', 'success', 15);
INSERT INTO public.audit_logs VALUES (172, 'UPDATE_MEMBER', 11, 'Updated member: Pero Peri─ç', '::ffff:127.0.0.1', '2024-12-20 20:04:48.117447', 'success', 15);
INSERT INTO public.audit_logs VALUES (176, 'MEMBERSHIP_FEE_PAYMENT', 15, 'Membership fee paid for 1999', '::1', '2024-12-20 20:53:06.318837', 'success', NULL);
INSERT INTO public.audit_logs VALUES (177, 'UPDATE_MEMBERSHIP', 13, 'Membership fee payment updated for member 15', '::1', '2024-12-20 20:53:06.321021', 'success', 15);
INSERT INTO public.audit_logs VALUES (178, 'UPDATE_MEMBER', 13, 'Updated member: Pero Peri─ç', '::1', '2024-12-20 20:53:18.670289', 'success', 15);
INSERT INTO public.audit_logs VALUES (179, 'ASSIGN_CARD_NUMBER', 13, 'Card number 44444 assigned to member 15', '::1', '2024-12-20 20:54:17.672912', 'success', 15);
INSERT INTO public.audit_logs VALUES (180, 'LOGIN_SUCCESS', 13, 'Successful login: Super User', '::1', '2024-12-20 20:57:30.542433', 'success', 13);
INSERT INTO public.audit_logs VALUES (181, 'LOGIN_SUCCESS', 15, 'Successful login: Pero Peri─ç', '::1', '2024-12-20 20:58:26.994765', 'success', 15);
INSERT INTO public.audit_logs VALUES (182, 'LOGIN_SUCCESS', 15, 'Successful login: Pero Peri─ç', '::1', '2024-12-20 23:06:51.321208', 'success', 15);
INSERT INTO public.audit_logs VALUES (183, 'LOGIN_SUCCESS', 11, 'Successful login: Admin User', '::1', '2024-12-20 23:09:27.666309', 'success', 11);
INSERT INTO public.audit_logs VALUES (184, 'LOGIN_SUCCESS', 13, 'Successful login: Super User', '::1', '2024-12-20 23:10:49.28814', 'success', 13);
INSERT INTO public.audit_logs VALUES (185, 'LOGIN_SUCCESS', 15, 'Successful login: Pero Peri─ç', '::1', '2024-12-20 23:11:54.965784', 'success', 15);
INSERT INTO public.audit_logs VALUES (186, 'LOGIN_SUCCESS', 11, 'Successful login: Admin User', '::ffff:127.0.0.1', '2024-12-21 00:33:37.162492', 'success', 11);
INSERT INTO public.audit_logs VALUES (187, 'LOGIN_SUCCESS', 11, 'Successful login: Admin User', '::ffff:127.0.0.1', '2024-12-21 01:20:49.044854', 'success', 11);
INSERT INTO public.audit_logs VALUES (188, 'LOGIN_SUCCESS', 11, 'Successful login: Admin User', '::ffff:127.0.0.1', '2024-12-21 11:49:01.80321', 'success', 11);
INSERT INTO public.audit_logs VALUES (189, 'LOGIN_SUCCESS', 11, 'Successful login: Admin User', '::ffff:127.0.0.1', '2024-12-21 13:15:52.265074', 'success', 11);
INSERT INTO public.audit_logs VALUES (190, 'LOGIN_SUCCESS', 11, 'Successful login: Admin User', '::ffff:127.0.0.1', '2024-12-21 13:27:52.955378', 'success', 11);
INSERT INTO public.audit_logs VALUES (191, 'LOGIN_SUCCESS', 13, 'Successful login: Super User', '::1', '2024-12-21 13:29:23.282983', 'success', 13);
INSERT INTO public.audit_logs VALUES (192, 'LOGIN_SUCCESS', 13, 'Successful login: Super User', '::1', '2024-12-21 16:23:53.026771', 'success', 13);
INSERT INTO public.audit_logs VALUES (193, 'LOGIN_SUCCESS', 15, 'Successful login: Pero Peri─ç', '::1', '2024-12-21 16:57:55.964689', 'success', 15);
INSERT INTO public.audit_logs VALUES (194, 'MEMBERSHIP_FEE_PAYMENT', 11, 'Membership fee paid for 1997', '::1', '2024-12-21 21:27:15.81628', 'success', NULL);
INSERT INTO public.audit_logs VALUES (195, 'UPDATE_MEMBERSHIP', 11, 'Membership fee payment updated for member 11', '::1', '2024-12-21 21:27:15.820858', 'success', 11);
INSERT INTO public.audit_logs VALUES (196, 'LOGIN_SUCCESS', 11, 'Successful login: Admin User', '::ffff:127.0.0.1', '2024-12-21 21:38:42.714074', 'success', 11);
INSERT INTO public.audit_logs VALUES (197, 'LOGIN_SUCCESS', 11, 'Successful login: Admin User', '::ffff:127.0.0.1', '2024-12-21 22:02:43.577265', 'success', 11);
INSERT INTO public.audit_logs VALUES (198, 'MEMBERSHIP_FEE_PAYMENT', 15, 'Membership fee paid for 1977', '::1', '2024-12-22 08:31:17.751437', 'success', NULL);
INSERT INTO public.audit_logs VALUES (199, 'UPDATE_MEMBERSHIP', 11, 'Membership fee payment updated for member 15', '::1', '2024-12-22 08:31:17.758293', 'success', 15);
INSERT INTO public.audit_logs VALUES (200, 'UPDATE_MEMBER', 11, 'Updated member: Pero Peri─ç', '::ffff:127.0.0.1', '2024-12-22 08:31:30.635573', 'success', 15);
INSERT INTO public.audit_logs VALUES (201, 'LOGIN_SUCCESS', 11, 'Successful login: Admin User', '::ffff:127.0.0.1', '2024-12-22 08:32:20.945835', 'success', 11);
INSERT INTO public.audit_logs VALUES (202, 'MEMBERSHIP_FEE_PAYMENT', 15, 'Membership fee paid for 1999', '::1', '2024-12-22 08:33:12.775847', 'success', NULL);
INSERT INTO public.audit_logs VALUES (203, 'UPDATE_MEMBERSHIP', 11, 'Membership fee payment updated for member 15', '::1', '2024-12-22 08:33:12.77977', 'success', 15);
INSERT INTO public.audit_logs VALUES (204, 'MEMBERSHIP_FEE_PAYMENT', 15, 'Membership fee paid for 1999', '::1', '2024-12-22 20:40:33.381265', 'success', NULL);
INSERT INTO public.audit_logs VALUES (205, 'UPDATE_MEMBERSHIP', 11, 'Membership fee payment updated for member 15', '::1', '2024-12-22 20:40:33.39153', 'success', 15);
INSERT INTO public.audit_logs VALUES (206, 'MEMBERSHIP_FEE_PAYMENT', 15, 'Membership fee paid for 1997', '::1', '2024-12-22 20:55:09.087955', 'success', NULL);
INSERT INTO public.audit_logs VALUES (207, 'UPDATE_MEMBERSHIP', 11, 'Membership fee payment updated for member 15', '::1', '2024-12-22 20:55:09.092187', 'success', 15);
INSERT INTO public.audit_logs VALUES (208, 'LOGIN_SUCCESS', 11, 'Successful login: Admin User', '::ffff:127.0.0.1', '2024-12-22 20:58:48.220175', 'success', 11);
INSERT INTO public.audit_logs VALUES (209, 'MEMBERSHIP_FEE_PAYMENT', 11, 'Membership fee paid for 1977', '::1', '2024-12-22 20:59:16.532732', 'success', NULL);
INSERT INTO public.audit_logs VALUES (210, 'UPDATE_MEMBERSHIP', 11, 'Membership fee payment updated for member 11', '::1', '2024-12-22 20:59:16.535428', 'success', 11);
INSERT INTO public.audit_logs VALUES (211, 'MEMBERSHIP_FEE_PAYMENT', 11, 'Membership fee paid for 1991', '::1', '2024-12-22 21:10:09.604275', 'success', NULL);
INSERT INTO public.audit_logs VALUES (212, 'UPDATE_MEMBERSHIP', 11, 'Membership fee payment updated for member 11', '::1', '2024-12-22 21:10:09.610719', 'success', 11);
INSERT INTO public.audit_logs VALUES (213, 'MEMBERSHIP_FEE_PAYMENT', 11, 'Membership fee paid for 1910', '::1', '2024-12-22 21:11:59.629313', 'success', NULL);
INSERT INTO public.audit_logs VALUES (214, 'UPDATE_MEMBERSHIP', 11, 'Membership fee payment updated for member 11', '::1', '2024-12-22 21:11:59.633226', 'success', 11);
INSERT INTO public.audit_logs VALUES (215, 'MEMBERSHIP_FEE_PAYMENT', 15, 'Membership fee paid for 1908', '::1', '2024-12-22 21:13:19.796147', 'success', NULL);
INSERT INTO public.audit_logs VALUES (216, 'UPDATE_MEMBERSHIP', 11, 'Membership fee payment updated for member 15', '::1', '2024-12-22 21:13:19.800828', 'success', 15);
INSERT INTO public.audit_logs VALUES (217, 'LOGIN_SUCCESS', 11, 'Successful login: Admin User', '::ffff:127.0.0.1', '2024-12-22 21:14:14.994956', 'success', 11);
INSERT INTO public.audit_logs VALUES (218, 'MEMBERSHIP_FEE_PAYMENT', 11, 'Membership fee paid for 1908', '::1', '2024-12-22 21:14:42.870716', 'success', NULL);
INSERT INTO public.audit_logs VALUES (219, 'UPDATE_MEMBERSHIP', 11, 'Membership fee payment updated for member 11', '::1', '2024-12-22 21:14:42.873761', 'success', 11);
INSERT INTO public.audit_logs VALUES (220, 'MEMBERSHIP_FEE_PAYMENT', 15, 'Membership fee paid for 1905', '::ffff:127.0.0.1', '2024-12-22 21:27:23.376008', 'success', NULL);
INSERT INTO public.audit_logs VALUES (221, 'UPDATE_MEMBERSHIP', 11, 'Membership fee payment updated for member 15', '::ffff:127.0.0.1', '2024-12-22 21:27:23.380769', 'success', 15);
INSERT INTO public.audit_logs VALUES (222, 'MEMBERSHIP_FEE_PAYMENT', 15, 'Membership fee paid for 1905', '::ffff:127.0.0.1', '2024-12-22 21:28:26.31537', 'success', NULL);
INSERT INTO public.audit_logs VALUES (223, 'UPDATE_MEMBERSHIP', 11, 'Membership fee payment updated for member 15', '::ffff:127.0.0.1', '2024-12-22 21:28:26.318385', 'success', 15);
INSERT INTO public.audit_logs VALUES (224, 'UPDATE_MEMBER', 11, 'Updated member: Pero Peri─ç', '::ffff:127.0.0.1', '2024-12-22 21:28:39.379575', 'success', 15);
INSERT INTO public.audit_logs VALUES (225, 'MEMBERSHIP_FEE_PAYMENT', 15, 'Membership fee paid for 1907', '::ffff:127.0.0.1', '2024-12-22 21:30:19.848556', 'success', NULL);
INSERT INTO public.audit_logs VALUES (226, 'UPDATE_MEMBERSHIP', 11, 'Membership fee payment updated for member 15', '::ffff:127.0.0.1', '2024-12-22 21:30:19.853128', 'success', 15);
INSERT INTO public.audit_logs VALUES (227, 'MEMBERSHIP_FEE_PAYMENT', 15, 'Membership fee paid for 1944', '::ffff:127.0.0.1', '2024-12-22 21:48:48.739035', 'success', NULL);
INSERT INTO public.audit_logs VALUES (228, 'UPDATE_MEMBERSHIP', 11, 'Membership fee payment updated for member 15', '::ffff:127.0.0.1', '2024-12-22 21:48:48.744835', 'success', 15);
INSERT INTO public.audit_logs VALUES (229, 'MEMBERSHIP_FEE_PAYMENT', 15, 'Membership fee paid for 1944', '::ffff:127.0.0.1', '2024-12-22 21:51:28.233954', 'success', NULL);
INSERT INTO public.audit_logs VALUES (230, 'UPDATE_MEMBERSHIP', 11, 'Membership fee payment updated for member 15', '::ffff:127.0.0.1', '2024-12-22 21:51:28.239539', 'success', 15);
INSERT INTO public.audit_logs VALUES (231, 'MEMBERSHIP_FEE_PAYMENT', 15, 'Membership fee paid for 1947', '::ffff:127.0.0.1', '2024-12-22 21:54:18.402379', 'success', NULL);
INSERT INTO public.audit_logs VALUES (232, 'UPDATE_MEMBERSHIP', 11, 'Membership fee payment updated for member 15', '::ffff:127.0.0.1', '2024-12-22 21:54:18.406419', 'success', 15);
INSERT INTO public.audit_logs VALUES (233, 'LOGIN_SUCCESS', 13, 'Successful login: Super User', '::1', '2024-12-22 21:56:14.207091', 'success', 13);
INSERT INTO public.audit_logs VALUES (234, 'MEMBERSHIP_FEE_PAYMENT', 15, 'Membership fee paid for 1994', '::1', '2024-12-22 21:57:11.68772', 'success', NULL);
INSERT INTO public.audit_logs VALUES (235, 'UPDATE_MEMBERSHIP', 13, 'Membership fee payment updated for member 15', '::1', '2024-12-22 21:57:11.690443', 'success', 15);
INSERT INTO public.audit_logs VALUES (236, 'UPDATE_MEMBER', 13, 'Updated member: Pero Peri─ç', '::1', '2024-12-22 21:57:40.512416', 'success', 15);
INSERT INTO public.audit_logs VALUES (237, 'MEMBERSHIP_FEE_PAYMENT', 15, 'Membership fee paid for 1997', '::ffff:127.0.0.1', '2024-12-22 22:04:30.053079', 'success', NULL);
INSERT INTO public.audit_logs VALUES (238, 'UPDATE_MEMBERSHIP', 11, 'Membership fee payment updated for member 15', '::ffff:127.0.0.1', '2024-12-22 22:04:30.056906', 'success', 15);
INSERT INTO public.audit_logs VALUES (239, 'MEMBERSHIP_FEE_PAYMENT', 15, 'Membership fee paid for 1993', '::ffff:127.0.0.1', '2024-12-22 22:13:30.415485', 'success', NULL);
INSERT INTO public.audit_logs VALUES (240, 'UPDATE_MEMBERSHIP', 11, 'Membership fee payment updated for member 15', '::ffff:127.0.0.1', '2024-12-22 22:13:30.420488', 'success', 15);
INSERT INTO public.audit_logs VALUES (241, 'UPDATE_MEMBER', 11, 'Updated member: Pero Peri─ç', '::ffff:127.0.0.1', '2024-12-22 22:13:48.466638', 'success', 15);
INSERT INTO public.audit_logs VALUES (242, 'LOGIN_SUCCESS', 11, 'Successful login: Admin User', '::ffff:127.0.0.1', '2024-12-22 22:16:05.546168', 'success', 11);
INSERT INTO public.audit_logs VALUES (243, 'MEMBERSHIP_FEE_PAYMENT', 15, 'Membership fee paid for 1991', '::ffff:127.0.0.1', '2024-12-22 22:16:52.338805', 'success', NULL);
INSERT INTO public.audit_logs VALUES (244, 'UPDATE_MEMBERSHIP', 11, 'Membership fee payment updated for member 15', '::ffff:127.0.0.1', '2024-12-22 22:16:52.343021', 'success', 15);
INSERT INTO public.audit_logs VALUES (245, 'LOGIN_SUCCESS', 13, 'Successful login: Super User', '::1', '2024-12-22 22:32:46.689563', 'success', 13);
INSERT INTO public.audit_logs VALUES (246, 'MEMBERSHIP_FEE_PAYMENT', 15, 'Membership fee paid for 1995', '::ffff:127.0.0.1', '2024-12-23 08:31:38.661165', 'success', NULL);
INSERT INTO public.audit_logs VALUES (247, 'UPDATE_MEMBERSHIP', 11, 'Membership fee payment updated for member 15', '::ffff:127.0.0.1', '2024-12-23 08:31:38.667343', 'success', 15);
INSERT INTO public.audit_logs VALUES (248, 'MEMBERSHIP_FEE_PAYMENT', 15, 'Membership fee paid for 1997', '::ffff:127.0.0.1', '2024-12-23 15:59:50.970654', 'success', NULL);
INSERT INTO public.audit_logs VALUES (249, 'UPDATE_MEMBERSHIP', 11, 'Membership fee payment updated for member 15', '::ffff:127.0.0.1', '2024-12-23 15:59:50.975533', 'success', 15);
INSERT INTO public.audit_logs VALUES (250, 'MEMBERSHIP_FEE_PAYMENT', 15, 'Membership fee paid for 1977', '::ffff:127.0.0.1', '2024-12-23 16:05:26.349748', 'success', NULL);
INSERT INTO public.audit_logs VALUES (251, 'UPDATE_MEMBERSHIP', 11, 'Membership fee payment updated for member 15', '::ffff:127.0.0.1', '2024-12-23 16:05:26.353452', 'success', 15);
INSERT INTO public.audit_logs VALUES (252, 'MEMBERSHIP_FEE_PAYMENT', 15, 'Membership fee paid for 1997', '::ffff:127.0.0.1', '2024-12-23 16:07:45.929664', 'success', NULL);
INSERT INTO public.audit_logs VALUES (253, 'UPDATE_MEMBERSHIP', 11, 'Membership fee payment updated for member 15', '::ffff:127.0.0.1', '2024-12-23 16:07:45.933759', 'success', 15);
INSERT INTO public.audit_logs VALUES (254, 'LOGIN_SUCCESS', 13, 'Successful login: Super User', '::1', '2024-12-23 23:17:26.572485', 'success', 13);
INSERT INTO public.audit_logs VALUES (255, 'LOGIN_SUCCESS', 11, 'Successful login: Admin User', '::ffff:127.0.0.1', '2024-12-23 23:26:45.004985', 'success', 11);
INSERT INTO public.audit_logs VALUES (256, 'LOGIN_SUCCESS', 13, 'Successful login: Super User', '::1', '2024-12-23 23:32:08.225934', 'success', 13);
INSERT INTO public.audit_logs VALUES (257, 'LOGIN_SUCCESS', 15, 'Successful login: Pero Peri─ç', '::1', '2024-12-24 20:33:39.294644', 'success', 15);
INSERT INTO public.audit_logs VALUES (258, 'LOGIN_SUCCESS', 11, 'Successful login: Admin User', '::ffff:127.0.0.1', '2024-12-24 20:54:46.615544', 'success', 11);
INSERT INTO public.audit_logs VALUES (259, 'CREATE_MESSAGE', 11, 'Message created by member 11', '::1', '2024-12-24 23:33:14.228551', 'success', NULL);
INSERT INTO public.audit_logs VALUES (260, 'LOGIN_SUCCESS', 13, 'Successful login: Super User', '::1', '2024-12-24 23:33:43.013828', 'success', 13);
INSERT INTO public.audit_logs VALUES (261, 'DELETE_MESSAGE', 13, 'Message 20 deleted', '::1', '2024-12-24 23:33:56.568078', 'success', NULL);
INSERT INTO public.audit_logs VALUES (262, 'LOGIN_SUCCESS', 15, 'Successful login: Pero Peri─ç', '::1', '2024-12-25 01:36:12.279569', 'success', 15);
INSERT INTO public.audit_logs VALUES (263, 'UPDATE_MEMBER', 11, 'Updated member: Pero Peri─ç', '::ffff:127.0.0.1', '2024-12-25 13:35:54.040011', 'success', 15);
INSERT INTO public.audit_logs VALUES (264, 'LOGIN_SUCCESS', 13, 'Successful login: Super User', '::1', '2024-12-25 13:37:39.205374', 'success', 13);
INSERT INTO public.audit_logs VALUES (265, 'LOGIN_SUCCESS', 11, 'Successful login: Admin User', '::ffff:127.0.0.1', '2024-12-25 19:35:37.391565', 'success', 11);
INSERT INTO public.audit_logs VALUES (273, 'LOGIN_SUCCESS', 11, 'Successful login: Admin User', '::ffff:127.0.0.1', '2024-12-25 21:20:18.137146', 'success', 11);
INSERT INTO public.audit_logs VALUES (274, 'LOGIN_SUCCESS', 15, 'Successful login: Pero Peri─ç', '::1', '2024-12-25 21:54:06.192987', 'success', 15);
INSERT INTO public.audit_logs VALUES (275, 'DELETE_MEMBER', 13, 'Failed member deletion: 12', '::1', '2024-12-26 09:01:08.723133', 'error', NULL);
INSERT INTO public.audit_logs VALUES (276, 'DELETE_MEMBER', 13, 'Failed member deletion: 12', '::1', '2024-12-26 09:05:32.247194', 'error', NULL);
INSERT INTO public.audit_logs VALUES (277, 'DELETE_MEMBER', 13, 'Failed member deletion: 12', '::1', '2024-12-26 09:12:13.058195', 'error', NULL);
INSERT INTO public.audit_logs VALUES (278, 'DELETE_MEMBER', 13, 'Failed member deletion: 12', '::1', '2024-12-26 09:14:47.301293', 'error', NULL);
INSERT INTO public.audit_logs VALUES (279, 'DELETE_MEMBER', 13, 'Failed member deletion: 12', '::1', '2024-12-26 09:17:46.758526', 'error', NULL);
INSERT INTO public.audit_logs VALUES (174, 'MEMBERSHIP_FEE_PAYMENT', NULL, 'Membership fee paid for 1993', '::1', '2024-12-20 20:21:03.907734', 'success', NULL);
INSERT INTO public.audit_logs VALUES (155, 'ASSIGN_PASSWORD', 13, 'Password assigned for member 12', '::1', '2024-12-20 01:47:01.390133', 'success', NULL);
INSERT INTO public.audit_logs VALUES (156, 'UPDATE_MEMBER', 13, 'Updated member: Member User', '::1', '2024-12-20 01:47:48.644077', 'success', NULL);
INSERT INTO public.audit_logs VALUES (173, 'ASSIGN_CARD_NUMBER', 13, 'Card number 22222 assigned to member 12', '::1', '2024-12-20 20:19:57.064316', 'success', NULL);
INSERT INTO public.audit_logs VALUES (175, 'UPDATE_MEMBERSHIP', 13, 'Membership fee payment updated for member 12', '::1', '2024-12-20 20:21:03.909604', 'success', NULL);
INSERT INTO public.audit_logs VALUES (280, 'DELETE_MEMBER', 13, 'Member deletion: Member User', '::1', '2024-12-26 09:28:13.840253', 'success', NULL);
INSERT INTO public.audit_logs VALUES (266, 'ASSIGN_PASSWORD', 11, 'Password assigned for member 16', '::ffff:127.0.0.1', '2024-12-25 20:08:22.870919', 'success', NULL);
INSERT INTO public.audit_logs VALUES (281, 'DELETE_MEMBER', 13, 'Member deletion: Mirza Mirzi─ç', '::1', '2024-12-26 11:26:45.362843', 'success', NULL);
INSERT INTO public.audit_logs VALUES (283, 'LOGIN_SUCCESS', 13, 'Successful login: Super User', '::1', '2024-12-26 16:39:43.361747', 'success', 13);
INSERT INTO public.audit_logs VALUES (282, 'ASSIGN_PASSWORD', 11, 'Password assigned for member 17', '::ffff:127.0.0.1', '2024-12-26 11:31:44.783709', 'success', NULL);
INSERT INTO public.audit_logs VALUES (284, 'DELETE_MEMBER', 13, 'Member deletion: User Member2', '::1', '2024-12-26 16:39:58.843164', 'success', NULL);
INSERT INTO public.audit_logs VALUES (285, 'LOGIN_SUCCESS', 11, 'Successful login: Admin User', '::1', '2024-12-26 20:33:57.61825', 'success', 11);
INSERT INTO public.audit_logs VALUES (286, 'LOGIN_SUCCESS', 11, 'Successful login: Admin User', '::ffff:127.0.0.1', '2024-12-26 20:34:52.905772', 'success', 11);
INSERT INTO public.audit_logs VALUES (287, 'LOGIN_SUCCESS', 11, 'Successful login: Admin User', '::1', '2024-12-26 20:43:25.542005', 'success', 11);
INSERT INTO public.audit_logs VALUES (288, 'LOGIN_SUCCESS', 13, 'Successful login: Super User', '::1', '2024-12-26 22:21:32.93774', 'success', 13);
INSERT INTO public.audit_logs VALUES (289, 'LOGIN_SUCCESS', 13, 'Successful login: Super User', '::1', '2024-12-26 22:51:21.276033', 'success', 13);
INSERT INTO public.audit_logs VALUES (290, 'LOGIN_SUCCESS', 15, 'Successful login: Pero Peri─ç', '::1', '2024-12-27 12:55:35.114667', 'success', 15);
INSERT INTO public.audit_logs VALUES (291, 'LOGIN_SUCCESS', 11, 'Successful login: Admin User', '::1', '2024-12-27 12:56:37.451034', 'success', 11);
INSERT INTO public.audit_logs VALUES (292, 'LOGIN_SUCCESS', 13, 'Successful login: Super User', '::1', '2024-12-27 13:01:00.548947', 'success', 13);
INSERT INTO public.audit_logs VALUES (293, 'LOGIN_SUCCESS', 15, 'Successful login: Pero Peri─ç', '::1', '2024-12-27 19:32:09.170023', 'success', 15);
INSERT INTO public.audit_logs VALUES (294, 'LOGIN_SUCCESS', 11, 'Successful login: Admin User', '::ffff:127.0.0.1', '2024-12-27 20:45:28.840431', 'success', 11);
INSERT INTO public.audit_logs VALUES (295, 'LOGIN_SUCCESS', 13, 'Successful login: Super User', '::1', '2024-12-27 23:07:43.983845', 'success', 13);
INSERT INTO public.audit_logs VALUES (296, 'UPDATE_MEMBER', 13, 'Updated member: Pero Peri─ç', '::1', '2024-12-28 00:26:18.483817', 'success', 15);
INSERT INTO public.audit_logs VALUES (297, 'LOGIN_SUCCESS', 11, 'Successful login: Admin User', '::ffff:127.0.0.1', '2024-12-28 01:35:25.336287', 'success', 11);
INSERT INTO public.audit_logs VALUES (298, 'LOGIN_SUCCESS', 11, 'Successful login: Admin User', '::ffff:127.0.0.1', '2024-12-29 08:22:31.716655', 'success', 11);
INSERT INTO public.audit_logs VALUES (299, 'LOGIN_SUCCESS', 13, 'Successful login: Super User', '::1', '2024-12-29 21:41:09.157344', 'success', 13);
INSERT INTO public.audit_logs VALUES (300, 'LOGIN_SUCCESS', 13, 'Successful login: Super User', '::1', '2024-12-29 23:16:37.063724', 'success', 13);
INSERT INTO public.audit_logs VALUES (307, 'LOGIN_SUCCESS', 15, 'Successful login: Pero Peri─ç', '::1', '2024-12-30 17:52:58.711618', 'success', 15);
INSERT INTO public.audit_logs VALUES (308, 'LOGIN_SUCCESS', 11, 'Successful login: Admin User', '::ffff:127.0.0.1', '2024-12-30 17:55:38.659848', 'success', 11);
INSERT INTO public.audit_logs VALUES (309, 'LOGIN_SUCCESS', 13, 'Successful login: Super User', '::1', '2024-12-30 18:00:55.212896', 'success', 13);
INSERT INTO public.audit_logs VALUES (310, 'LOGIN_SUCCESS', 11, 'Successful login: Admin User', '::ffff:127.0.0.1', '2024-12-30 19:52:21.787352', 'success', 11);
INSERT INTO public.audit_logs VALUES (311, 'UPDATE_MEMBER', 13, 'Updated member: Pero Perić', '::1', '2024-12-30 20:09:18.116466', 'success', 15);
INSERT INTO public.audit_logs VALUES (312, 'LOGIN_SUCCESS', 13, 'Successful login: Super User', '::1', '2024-12-30 22:45:25.959238', 'success', 13);
INSERT INTO public.audit_logs VALUES (313, 'LOGIN_SUCCESS', 13, 'Successful login: Super User', '::1', '2025-01-02 23:29:41.651061', 'success', 13);
INSERT INTO public.audit_logs VALUES (314, 'LOGIN_SUCCESS', 11, 'Successful login: Admin User', '::ffff:127.0.0.1', '2025-01-03 08:33:56.196974', 'success', 11);
INSERT INTO public.audit_logs VALUES (315, 'LOGIN_SUCCESS', 13, 'Successful login: Super User', '::1', '2025-01-04 00:28:25.204324', 'success', 13);
INSERT INTO public.audit_logs VALUES (316, 'LOGIN_SUCCESS', 13, 'Successful login: Super User', '::1', '2025-01-04 02:51:36.596358', 'success', 13);
INSERT INTO public.audit_logs VALUES (317, 'LOGIN_SUCCESS', 13, 'Successful login: Super User', '::1', '2025-01-04 13:27:02.987526', 'success', 13);
INSERT INTO public.audit_logs VALUES (318, 'LOGIN_SUCCESS', 11, 'Successful login: Admin User', '::ffff:127.0.0.1', '2025-01-04 21:04:01.972505', 'success', 11);
INSERT INTO public.audit_logs VALUES (319, 'LOGIN_SUCCESS', 13, 'Successful login: Super User', '::1', '2025-01-06 21:29:34.344512', 'success', 13);
INSERT INTO public.audit_logs VALUES (320, 'LOGIN_SUCCESS', 11, 'Successful login: Admin User', '::ffff:127.0.0.1', '2025-01-06 22:49:12.215291', 'success', 11);
INSERT INTO public.audit_logs VALUES (321, 'LOGIN_SUCCESS', 13, 'Successful login: Super User', '::1', '2025-01-07 22:59:26.337838', 'success', 13);
INSERT INTO public.audit_logs VALUES (330, 'LOGIN_SUCCESS', 11, 'Successful login: Admin User', '::ffff:127.0.0.1', '2025-01-14 23:47:31.741324', 'success', 11);
INSERT INTO public.audit_logs VALUES (331, 'LOGIN_SUCCESS', 13, 'Successful login: Super User', '::ffff:127.0.0.1', '2025-01-14 23:48:24.515888', 'success', 13);
INSERT INTO public.audit_logs VALUES (332, 'LOGIN_SUCCESS', 13, 'Successful login: Super User', '::1', '2025-01-15 01:31:53.031414', 'success', 13);
INSERT INTO public.audit_logs VALUES (333, 'LOGIN_SUCCESS', 13, 'Successful login: Super User', '::ffff:127.0.0.1', '2025-01-15 02:00:06.149977', 'success', 13);
INSERT INTO public.audit_logs VALUES (334, 'LOGIN_SUCCESS', 13, 'Successful login: Super User', '::1', '2025-01-15 02:31:23.997922', 'success', 13);
INSERT INTO public.audit_logs VALUES (335, 'LOGIN_SUCCESS', 13, 'Successful login: Super User', '::1', '2025-01-15 02:34:46.631517', 'success', 13);
INSERT INTO public.audit_logs VALUES (338, 'LOGIN_SUCCESS', 11, 'Successful login: Admin User', '::ffff:127.0.0.1', '2025-01-15 02:49:57.334985', 'success', 11);
INSERT INTO public.audit_logs VALUES (339, 'LOGIN_SUCCESS', 13, 'Successful login: Super User', '::ffff:127.0.0.1', '2025-01-15 02:50:20.107962', 'success', 13);
INSERT INTO public.audit_logs VALUES (340, 'LOGIN_SUCCESS', 13, 'Successful login: Super User', '::ffff:127.0.0.1', '2025-01-15 03:11:47.923378', 'success', 13);
INSERT INTO public.audit_logs VALUES (341, 'LOGIN_SUCCESS', 13, 'Successful login: Super User', '::1', '2025-01-15 09:08:55.597826', 'success', 13);
INSERT INTO public.audit_logs VALUES (342, 'LOGIN_SUCCESS', 13, 'Successful login: Super User', '::1', '2025-01-15 09:45:24.174041', 'success', 13);
INSERT INTO public.audit_logs VALUES (343, 'LOGIN_SUCCESS', 13, 'Successful login: Super User', '::1', '2025-01-15 09:46:13.517648', 'success', 13);
INSERT INTO public.audit_logs VALUES (344, 'LOGIN_SUCCESS', 13, 'Successful login: Super User', '::1', '2025-01-15 10:18:39.136668', 'success', 13);
INSERT INTO public.audit_logs VALUES (345, 'LOGIN_SUCCESS', 13, 'Successful login: Super User', '::ffff:127.0.0.1', '2025-01-15 10:21:17.108739', 'success', 13);
INSERT INTO public.audit_logs VALUES (346, 'LOGIN_SUCCESS', 13, 'Successful login: Super User', '::1', '2025-01-15 10:57:05.115124', 'success', 13);
INSERT INTO public.audit_logs VALUES (347, 'LOGIN_SUCCESS', 13, 'Successful login: Super User', '::1', '2025-01-15 11:10:54.593134', 'success', 13);
INSERT INTO public.audit_logs VALUES (348, 'LOGIN_SUCCESS', 13, 'Successful login: Super User', '::ffff:127.0.0.1', '2025-01-16 01:51:06.319724', 'success', 13);
INSERT INTO public.audit_logs VALUES (349, 'LOGIN_SUCCESS', 13, 'Successful login: Super User', '::1', '2025-01-16 03:56:47.591423', 'success', 13);
INSERT INTO public.audit_logs VALUES (350, 'LOGIN_SUCCESS', 13, 'Successful login: Super User', '::1', '2025-01-16 15:43:32.782477', 'success', 13);
INSERT INTO public.audit_logs VALUES (353, 'LOGIN_SUCCESS', 11, 'Successful login: Admin User', '::1', '2025-01-16 21:46:26.956898', 'success', 11);
INSERT INTO public.audit_logs VALUES (354, 'LOGIN_SUCCESS', 13, 'Successful login: Super User', '::1', '2025-01-17 00:56:59.364842', 'success', 13);
INSERT INTO public.audit_logs VALUES (355, 'LOGIN_SUCCESS', 13, 'Successful login: Super User', '::1', '2025-01-18 01:44:01.779485', 'success', 13);
INSERT INTO public.audit_logs VALUES (356, 'LOGIN_SUCCESS', 13, 'Successful login: Super User', '::ffff:127.0.0.1', '2025-01-18 21:50:06.682005', 'success', 13);
INSERT INTO public.audit_logs VALUES (357, 'LOGIN_SUCCESS', 13, 'Successful login: Super User', '::1', '2025-01-19 21:07:35.033966', 'success', 13);
INSERT INTO public.audit_logs VALUES (358, 'LOGIN_SUCCESS', 13, 'Successful login: Super User', '::1', '2025-01-21 00:50:46.56302', 'success', 13);
INSERT INTO public.audit_logs VALUES (359, 'LOGIN_SUCCESS', 13, 'Successful login: Super User', '::1', '2025-01-21 23:23:00.69244', 'success', 13);
INSERT INTO public.audit_logs VALUES (360, 'LOGIN_SUCCESS', 13, 'Successful login: Super User', '::1', '2025-01-22 23:44:22.642116', 'success', 13);
INSERT INTO public.audit_logs VALUES (361, 'LOGIN_SUCCESS', 13, 'Successful login: Super User', '::1', '2025-02-10 22:25:08.748726', 'success', 13);
INSERT INTO public.audit_logs VALUES (362, 'LOGIN_SUCCESS', 15, 'Successful login: Pero Perić', '::1', '2025-02-10 22:43:31.558132', 'success', 15);
INSERT INTO public.audit_logs VALUES (363, 'LOGIN_SUCCESS', 13, 'Successful login: Super User', '::1', '2025-02-15 09:13:29.196293', 'success', 13);
INSERT INTO public.audit_logs VALUES (364, 'LOGIN_SUCCESS', 13, 'Successful login: Super User', '::1', '2025-02-16 16:46:23.715505', 'success', 13);
INSERT INTO public.audit_logs VALUES (365, 'LOGIN_SUCCESS', 13, 'Successful login: Super User', '::1', '2025-02-17 21:19:30.773788', 'success', 13);


--
-- Data for Name: member_messages; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: members_backup; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: membership_details; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.membership_details VALUES (13, '12345', 2011, true, '2011-12-31 12:00:00');
INSERT INTO public.membership_details VALUES (11, '54321', 1997, true, '1997-11-14 11:00:00');
INSERT INTO public.membership_details VALUES (15, '44444', 2008, true, '2008-10-11 10:00:00');


--
-- Data for Name: membership_periods; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.membership_periods VALUES (1, 15, '2007-07-07 00:00:00', NULL, NULL, '2024-12-18 14:40:59.172674');
INSERT INTO public.membership_periods VALUES (2, 13, '1911-07-07 00:00:00', NULL, NULL, '2024-12-18 19:03:09.792895');
INSERT INTO public.membership_periods VALUES (4, 11, '1997-07-07 14:00:00', NULL, NULL, '2024-12-21 21:27:15.812568');


--
-- Data for Name: stamp_inventory; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.stamp_inventory VALUES (1, 'employed', 0, 0, DEFAULT, '2025-02-18 15:39:15.928537');
INSERT INTO public.stamp_inventory VALUES (2, 'student', 0, 0, DEFAULT, '2025-02-18 15:39:15.928537');
INSERT INTO public.stamp_inventory VALUES (3, 'pensioner', 0, 0, DEFAULT, '2025-02-18 15:39:15.928537');


--
-- Data for Name: system_settings; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.system_settings VALUES ('default', 5, '2024-12-30 11:10:08.703278', 1, 'system');


--
-- Name: Hours_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."Hours_id_seq"', 1, false);


--
-- Name: activities_activity_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.activities_activity_id_seq', 3, true);


--
-- Name: activity_participants_participation_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.activity_participants_participation_id_seq', 5, true);


--
-- Name: activity_types_type_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.activity_types_type_id_seq', 1062, true);


--
-- Name: annual_statistics_stat_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.annual_statistics_stat_id_seq', 3, true);


--
-- Name: audit_logs_log_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.audit_logs_log_id_seq', 365, true);


--
-- Name: member_messages_message_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.member_messages_message_id_seq', 20, true);


--
-- Name: members_member_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.members_member_id_seq', 19, true);


--
-- Name: membership_periods_period_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.membership_periods_period_id_seq', 4, true);


--
-- Name: stamp_inventory_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.stamp_inventory_id_seq', 3, true);


--
-- PostgreSQL database dump complete
--

