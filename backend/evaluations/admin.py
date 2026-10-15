from django.contrib import admin

from .models import Course, Cycle, Department, Signup

admin.site.register(Course)
admin.site.register(Cycle)
admin.site.register(Department)
admin.site.register(Signup)