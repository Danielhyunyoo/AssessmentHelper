from django.urls import path

from . import views

urlpatterns = [
    path("auth/csrf/", views.csrf_cookie, name="auth-csrf"),
    path("auth/login/", views.session_login, name="auth-login"),
    path("auth/logout/", views.session_logout, name="auth-logout"),
    path("auth/session/", views.session_user, name="auth-session"),
    path("me/", views.my_professor, name="my-professor"),
    path("me/courses/", views.my_courses, name="my-courses"),
    path("signups/", views.create_signup, name="create-signup"),
    path("registration/status/", views.registration_status, name="registration-status"),
    path("signups/course/", views.select_signup_course, name="select-signup-course"),
    path("committee/cycle-dates/", views.committee_cycle_dates, name="committee-cycle-dates"),
    path("signups/availability/", views.signup_availability, name="signup-availability"),
]
urlpatterns += [
    path("dashboard/", views.faculty_dashboard, name="faculty-dashboard"),
]

urlpatterns += [
    path("notifications/", views.my_notifications, name="my-notifications"),
    path("notifications/read-all/", views.mark_all_notifications_read, name="mark-all-notifications-read"),
    path("notifications/<int:notification_id>/read/", views.mark_notification_read, name="mark-notification-read"),
]


urlpatterns += [
    path("committee/signups/<int:signup_id>/candidate-pool/", views.committee_candidate_pool, name="committee-candidate-pool"),
    path("committee/signups/<int:signup_id>/release-candidates/", views.committee_release_candidates, name="committee-release-candidates"),
    path("matches/", views.my_matched_candidates, name="my-matches"),
    path("invitations/", views.my_sent_invitations, name="sent-invitations"),
    path("invitations/send/", views.send_invitation, name="send-invitation"),
    path("invitations/received/", views.my_received_invitations, name="received-invitations"),
    path("invitations/<int:invitation_id>/respond/", views.respond_to_invitation, name="respond-invitation"),
    path("pairings/confirm/", views.confirm_pairing, name="confirm-pairing"),
]


urlpatterns += [
    path("observations/", views.observations_collection, name="observations-collection"),
    path("observations/<int:observation_id>/", views.observation_detail, name="observation-detail"),
    path("observations/<int:observation_id>/sign/", views.sign_observation, name="sign-observation"),
    path("observations/<int:observation_id>/cancel/", views.cancel_observation, name="cancel-observation"),
]

urlpatterns += [
    path("surveys/", views.surveys_collection, name="surveys-collection"),
    path("surveys/<int:survey_id>/", views.survey_detail, name="survey-detail"),
]

urlpatterns += [
    path("committee/pending-records/", views.committee_pending_records, name="committee-pending-records"),
    path("committee/pending-records/<int:pairing_id>/remind/", views.committee_remind_record, name="committee-remind-record"),
    path("committee/pending-surveys/", views.committee_pending_surveys, name="committee-pending-surveys"),
    path("committee/pending-surveys/<int:pairing_id>/<str:role>/remind/", views.committee_remind_survey, name="committee-remind-survey"),
]


# A04 faculty roster and communication
urlpatterns += [
    path("committee/faculty/", views.committee_faculty, name="committee-faculty"),
    path("committee/faculty/unregistered/", views.committee_unregistered_faculty, name="committee-unregistered-faculty"),
    path("committee/faculty/<int:user_id>/rank/", views.committee_update_faculty_rank, name="committee-update-faculty-rank"),
    path("committee/faculty/remind/", views.committee_remind_unregistered, name="committee-remind-unregistered"),
]

# A01 committee overview
urlpatterns += [
    path("committee/dashboard/", views.committee_dashboard, name="committee-dashboard"),
]

# A03 unmatched faculty and carry-forward
urlpatterns += [
    path("committee/unmatched/", views.committee_unmatched_faculty, name="committee-unmatched"),
    path("committee/carry-forwards/", views.committee_carry_forward_list, name="committee-carry-forwards"),
    path("committee/carry-forwards/create/", views.committee_carry_forward, name="committee-carry-forward-create"),
]
urlpatterns += [
    path("committee/carry-forwards/due/", views.committee_carried_forward_due, name="committee-carried-forward-due"),
]

# A07 KPI dashboard and CSV export
urlpatterns += [
    path("committee/kpis/", views.committee_kpis, name="committee-kpis"),
    path("committee/kpis/export.csv", views.committee_kpis_csv, name="committee-kpis-export"),
]


# A08 form version management
urlpatterns += [
    path("committee/templates/", views.committee_templates, name="committee-templates"),
    path("committee/templates/<int:template_id>/", views.committee_template_detail, name="committee-template-detail"),
    path("committee/templates/<int:template_id>/clone/", views.committee_template_clone, name="committee-template-clone"),
    path("committee/templates/<int:template_id>/publish/", views.committee_template_publish, name="committee-template-publish"),
]
