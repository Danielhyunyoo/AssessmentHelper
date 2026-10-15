from django.contrib import admin

from .models import Course, EvaluationCycle, Signup


admin.site.register(Course)
admin.site.register(EvaluationCycle)
admin.site.register(Signup)