import { format } from "date-fns";
import { useEnrollmentYearValidation } from 'dhis2-semis-functions';
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
    const [validating, setValidating] = useState(false);
    const { attributes = [] } = useGetAttributes({ programData: programData! });
    const programStagesToSave = useGetUsedProgramStages({ sectionType: sectionName });
    const { errorLoading, returnPattern, loadingCodes, generatedVariables } = useGetPatternCode();
    const { open, setOpen, saveMode, initialValues: initialValuesFromSearch, formFields = [], formVariablesFields, setFormInitialValues, i18n } = props;
    const sectionLabels = getSectionLabels(sectionName, i18n);
    const { getInitialValues, initialValues: updateInitialValues, loading: initialValuesLoading, enrollmentEvents } = useGetEnrollmentUpdateInitialValues()

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
        setValidating(true);
        try {
            await validateYear({
                students: [{ trackedEntity: saveMode === 'UPDATE' ? trackedEntity : initialValuesFromSearch?.trackedEntity, values: e }],
                enrollmentYear: e[enrollmentAcademicYearField],
                dataStore: dataStoreData, calendars: schoolCalendar?.schoolCalendar, programConfig: programData, academicYearField: enrollmentAcademicYearField, sectionType: sectionName,
            });
        } catch {
            // The validation hook displays the error beside the Academic Year field.
            return;
        } finally {
            setValidating(false);
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
                    trackedEntityId: initialValuesFromSearch!["trackedEntity"]
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
