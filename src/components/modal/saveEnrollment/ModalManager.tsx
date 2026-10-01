import { format } from "date-fns";
import { useEnrollmentYearValidation, useShowAlerts, useGetLearnerEnrollments, enrollmentDates, getAcademicYearDates, getAcademicYearOptions, TRANSITION_CONFLICT_MESSAGES, type TransitionPlan } from 'dhis2-semis-functions';
import { useSchoolCalendarKey } from 'dhis2-semis-components';
import { useRecoilState } from "recoil";
import ModalContent from "./ModalContent";
import React, { useEffect, useState } from "react";
import { TableDataRefetch } from "dhis2-semis-types"
import { ModalManagerInterface } from "../../../types/modal/ModalProps";
import useGetSelectedKeys from "../../../hooks/config/useGetSelectedKeys";
import { ModalComponent, useGetUsedProgramStages, } from "dhis2-semis-components";
import { enrollmentPostBody, enrollmentUpdateBody } from "../../../utils/enrollment";
import useGetEnrollmentUpdateInitialValues from "../../../hooks/form/useGetEnrollmentUpdateInitialValues";
import { useGetAttributes, useGetPatternCode, useSaveTei, useUrlParams, useGetSectionTypeLabel, RulesEngine, capitalizeString, getSectionLabels } from "dhis2-semis-functions";


function ModalManager(props: ModalManagerInterface) {
    const { urlParameters, useQuery } = useUrlParams();
    const { school, schoolName } = urlParameters;
    const { saveTei, loading: saving } = useSaveTei();
    const { sectionName } = useGetSectionTypeLabel();
    const enrollment = useQuery.get("enrollment") as string
    const [refetch, setRefetch] = useRecoilState(TableDataRefetch);
    const trackedEntity = useQuery.get("trackedEntity") as string
    const { program: programData, dataStoreData } = useGetSelectedKeys()
    const schoolCalendar = useSchoolCalendarKey();
    const enrollmentAcademicYearField = dataStoreData.registration.academicYear || schoolCalendar?.academicYear;
    const validateYear = useEnrollmentYearValidation();
    const { show } = useShowAlerts();
    const [validating, setValidating] = useState(false);
    const { attributes = [] } = useGetAttributes({ programData: programData! });
    const programStagesToSave = useGetUsedProgramStages({ sectionType: sectionName });
    const { errorLoading, returnPattern, loadingCodes, generatedVariables } = useGetPatternCode();
    const { open, setOpen, saveMode, initialValues: initialValuesFromSearch, formFields = [], formVariablesFields, setFormInitialValues, i18n } = props;
    const sectionLabels = getSectionLabels(sectionName, i18n);
    const { getInitialValues, initialValues: updateInitialValues, loading: initialValuesLoading, enrollmentEvents, existingEnrollment } = useGetEnrollmentUpdateInitialValues()
    const { planEnrollments } = useGetLearnerEnrollments()

    let allInitialValues = {
        orgUnit: school,
        registerschoolstaticform: schoolName,
        enrollment_date: format(new Date(), "yyyy-MM-dd"),
    }

    const [values, setValues] = useState<{ [key: string]: any }>({ ...allInitialValues });

    const { runRulesEngine, updatedVariables } = RulesEngine({
        values: values,
        variables: formFields,
        program: programData!.id,
        type: "programStageSection",
    })


    useEffect(() => {
        runRulesEngine({ overrideVariables: formFields, overrideValues: values })
    }, [values])

    useEffect(() => {
        if (open && saveMode == "CREATE")
            void returnPattern(attributes, school);

        if (open && saveMode == "UPDATE")
            void getInitialValues(trackedEntity, enrollment);
    }, [open]);

    useEffect(() => {
        return () => {
            if (!open)
                setValues({});
            setFormInitialValues && setFormInitialValues({})
        }
    }, [open])

    const handleCloseModal = () => setOpen(false);

    const handleChange = (e: { field: any; value: string; name: string }) => {
        // const { name, value } = e;
        // setValues(prev => ({
        //     ...allInitialValues,
        //     ...prev,
        //     [name]: value,
        // }));
    };


    async function onSubmit(e: Record<string, any>) {
        const calendars = schoolCalendar?.schoolCalendar ?? [];
        const options = getAcademicYearOptions(programData, enrollmentAcademicYearField);
        const academicYear = e[enrollmentAcademicYearField];
        const newTrackedEntity: string | undefined = initialValuesFromSearch?.trackedEntity;
        setValidating(true);
        let plan: TransitionPlan | undefined;
        try {
            await validateYear({
                students: [{ trackedEntity: saveMode === 'UPDATE' ? trackedEntity : newTrackedEntity, values: e }],
                enrollmentYear: academicYear,
                dataStore: dataStoreData, calendars: schoolCalendar?.schoolCalendar, programConfig: programData, academicYearField: enrollmentAcademicYearField, sectionType: sectionName,
            });
        } catch {
            // The validation hook displays the error beside the Academic Year field.
            setValidating(false);
            return;
        }
        try {
            if (saveMode === "CREATE") {
                // One enrollment per academic year: close an earlier ACTIVE one, or stop on a conflict
                try {
                    const { plans } = await planEnrollments({
                        trackedEntities: [newTrackedEntity],
                        program: programData?.id!,
                        targetAcademicYear: academicYear,
                        currentAcademicYear: schoolCalendar?.defaults?.academicYear ?? academicYear,
                        registrationStage: dataStoreData?.registration?.programStage,
                        academicYearDataElement: enrollmentAcademicYearField,
                        years: { calendars, options },
                    });
                    plan = plans.get(newTrackedEntity ?? "");
                } catch {
                    throw new Error("Could not check existing enrollments. Please try again.");
                }
            }
        } catch (error: any) {
            // Not a field problem (e.g. the enrollment check failed), so show it as an alert
            show({ message: i18n.t(error.message), type: { critical: true } });
            return;
        } finally {
            setValidating(false);
        }
        if (plan?.conflict) {
            show({ message: i18n.t(TRANSITION_CONFLICT_MESSAGES[plan.conflict]), type: { critical: true } });
            return;
        }
        if (saveMode === "UPDATE" && !existingEnrollment) {
            show({ message: i18n.t("Could not load the enrollment. Please close and try again."), type: { critical: true } });
            return;
        }

        const { calendarFound, ...dates } = enrollmentDates({ calendar: calendars, academicYear, enrollmentDate: e?.enrollment_date, options });
        const academicYearChanged = saveMode === "UPDATE" && String(academicYear ?? "") !== String(updateInitialValues?.[enrollmentAcademicYearField] ?? "");
        if ((saveMode === "CREATE" || academicYearChanged) && !calendarFound) {
            show({ message: i18n.t("The academic year is not in the school calendar. The enrollment date is used as its start date."), type: { warning: true } });
        }

        const data = () => {
            if (saveMode === "CREATE") {
                return enrollmentPostBody({
                    values: e,
                    orgUnitId: school!,
                    programStagesToSave,
                    programId: programData?.id!,
                    formVariablesFields: formVariablesFields,
                    enrollmentDate: e?.enrollment_date,
                    trackedEntityType: programData?.trackedEntityType?.id!,
                    trackedEntityId: newTrackedEntity,
                    plan: plan!,
                    dates,
                });
            }

            if (saveMode === "UPDATE") {
                return enrollmentUpdateBody({
                    formVariablesFields: formVariablesFields,
                    enrollmentId: e?.enrollment,
                    enrollmentDate: e?.enrollment_date,
                    trackedEntityId: e?.trackedEntity,
                    trackedEntityType: programData?.trackedEntityType?.id!,
                    orgUnitId: school!,
                    programId: programData?.id!,
                    formValues: e,
                    events: enrollmentEvents?.events,
                    existingEnrollment,
                    enrollmentDateChanged: Boolean(e?.enrollment_date) && e?.enrollment_date !== updateInitialValues?.enrollment_date,
                    academicYearStart: academicYearChanged ? getAcademicYearDates(calendars, academicYear, options)?.startDate : undefined,
                    registrationStage: dataStoreData?.registration?.programStage,
                });
            }
        };

        saveTei({
            data: data(),
            program: programData,
            messages: {
                error: `${i18n.t("Could not conclude the opertation.")}`,
                sucess: `${i18n.t("Operation concluded successfully")}`,
            },
            handleComplete: () => { handleCloseModal(); setRefetch(!refetch) },
        });
    }

    if (errorLoading) {
        handleCloseModal();
        return;
    }

    return (
        <ModalComponent
            open={open}
            handleClose={handleCloseModal}
            loading={loadingCodes || initialValuesLoading}
            title={i18n.t('Single {{section}} Enrollment {{mode}}', {
                section: sectionLabels.title,
                mode: saveMode === 'UPDATE' ? i18n.t('Update') : ''
            })}
        >
            <ModalContent
                loading={saving || validating}
                onSubmit={onSubmit}
                formValues={values}
                onChange={handleChange}
                setFormValues={setValues}
                onCancel={handleCloseModal}
                formFields={validateYear.withFieldError(updatedVariables, enrollmentAcademicYearField, values[enrollmentAcademicYearField], message => i18n.t(message))}
                trackedEntity={trackedEntity}
                initialValues={{
                    ...allInitialValues,
                    ...generatedVariables,
                    ...updateInitialValues,
                    ...initialValuesFromSearch,
                }}
            />
        </ModalComponent>
    );
}

export default ModalManager;
