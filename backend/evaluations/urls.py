from django.urls import path

from . import views

urlpatterns = [
    path("me/", views.my_professor, name="my-professor"),
    path("me/courses/", views.my_courses, name="my-courses"),
    path("signups/", views.create_signup, name="create-signup"),
]