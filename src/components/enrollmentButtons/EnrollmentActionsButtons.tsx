import React, { useEffect, useState } from 'react'
import { Form } from "react-final-form";
import { Tooltip } from '@mui/material';
import styles from './enrollmentActionsButtons.module.css'
import ModalManager from '../modal/saveEnrollment/ModalManager';
import { useBuildForm, useGetSectionTypeLabel, useUrlParams, useShowAlerts, useCheckFilters } from 'dhis2-semis-functions';
import { D2I18n, Modules, TableDataRefetch } from 'dhis2-semis-types'
import { IconAddCircle24, Button, ButtonStrip, IconUserGroup16, IconSearch24 } from "@dhis2/ui";
import { ModalSearchEnrollmentContent, ModalSearchAdmissionContent, DataExporter, DataImporter, CustomDropdown as DropdownButton, useSchoolCalendarKey } from 'dhis2-semis-components';
import { formFields } from '../../utils/constants/form/enrollmentForm';
import useGetSelectedKeys from '../../hooks/config/useGetSelectedKeys';
import { useSetRecoilState } from 'recoil';
import EnrollSingleModal from '../../../../admission/src/components/modal/enrollFromAdmission/EnrollSingleModal';

function EnrollmentActionsButtons({ i18n, baseUrl }: { i18n: D2I18n, baseUrl: string }) {
    const { urlParameters } = useUrlParams();
    const { sectionName } = useGetSectionTypeLabel();
    const schoolCalendar = useSchoolCalendarKey()
    const { dataStoreData, program: programData } = useGetSelectedKeys()
    const [formInitialValues, setFormInitialValues] = useState({})
    const [openSaveModal, setOpenSaveModal] = useState<boolean>(false)
    const { school: orgUnit, academicYear } = urlParameters;
    const [openSearchEnrollment, setOpenSearchEnrollment] = useState<boolean>(false);
    const [openSearchAdmission, setOpenSearchAdmission] = useState<boolean>(false);
    const [openEnrollSingleModal, setOpenEnrollSingleModal] = useState<boolean>(false);
    const [enrollStudentData, setEnrollStudentData] = useState<{
        trackedEntityId: string;
        enrollmentId?: string;
        activeEnrollmentToComplete?: string;
        activeEnrollmentEnrolledAt?: string;
        initialValues: Record<string, any>;
    }>({ trackedEntityId: "", enrollmentId: undefined, activeEnrollmentToComplete: undefined, activeEnrollmentEnrolledAt: undefined, initialValues: {} });
    const { formData } = useBuildForm({ dataStoreData, programData, module: Modules.Enrollment, schoolCalendar });
    const { hide, show } = useShowAlerts()
    const { areAllSelected, getFilters } = useCheckFilters({ filters: (dataStoreData.filters.dataElements ?? []) as unknown as any })
    const filters = [
        academicYear !== null ? `${schoolCalendar?.academicYear}:in:${academicYear}` : null,
        ...getFilters()
    ].filter((filter): filter is string => filter !== null)
    const setRefetch = useSetRecoilState(TableDataRefetch);


    const showAlert = (error: any) => {
        show({ message: `${i18n.t("Unknown error")}: ${error}`, type: { critical: true } })
        setTimeout(hide, 5000);
    }

    const onSelectTeiForEnrollment = (payload: {
        trackedEntityId: string;
        enrollmentId?: string;
        activeEnrollmentToComplete?: string;
        activeEnrollmentEnrolledAt?: string;
        initialValues?: Record<string, any>;
    }) => {
        setEnrollStudentData({
            trackedEntityId: payload.trackedEntityId,
            enrollmentId: payload.enrollmentId,
            activeEnrollmentToComplete: payload.activeEnrollmentToComplete,
            activeEnrollmentEnrolledAt: payload.activeEnrollmentEnrolledAt,
            initialValues: payload.initialValues ?? {},
        });
        setOpenEnrollSingleModal(true);
    }

    const enrollmentOptions: any = [
        {
            label: <DataImporter
                baseURL={baseUrl}
                label={i18n.t('Enroll new {{section}}', {
                    section: `${i18n.t(sectionName)}s`,
                })}
                module={Modules.Enrollment}
                onError={(e: any) => { showAlert(e) }}
                programConfig={programData!}
                sectionType={sectionName}
                selectedSectionDataStore={dataStoreData}
                updating={false}
                title={i18n.t("Bulk Enrollment")}
                onClose={() => setRefetch(prev => !prev)}
            />,
            divider: true,
            disabled: false,
        },
        {
            label: <DataImporter
                baseURL={baseUrl}
                label={i18n.t('Update existing {{section}}', {
                    section: `${i18n.t(sectionName)}s`,
                })}
                module={Modules.Enrollment}
                onError={(e: any) => { showAlert(e) }}
                programConfig={programData!}
                sectionType={sectionName}
                selectedSectionDataStore={dataStoreData}
                updating={true}
                title={i18n.t("Bulk Enrollment Update")}
                onClose={() => setRefetch(prev => !prev)}
            />,
            divider: true,
            disabled: false,
        },
        {
            label: <DataExporter
                Form={Form}
                baseURL={baseUrl}
                eventFilters={filters}
                label={i18n.t('Export Empty Template')}
                module={Modules.Enrollment}
                onError={(e: any) => { showAlert(e) }}
                programConfig={programData!}
                sectionType={sectionName}
                selectedSectionDataStore={dataStoreData}
                empty={true}
                stagesToExport={[dataStoreData.registration.programStage]}
            />,
            divider: false,
            disabled: false,
        },
        {
            label: <DataExporter
                Form={Form}
                baseURL={baseUrl}
                eventFilters={filters}
                label={i18n.t('Export Existing {{section}}', {
                    section: `${i18n.t(sectionName)}s`,
                })}
                module={Modules.Enrollment}
                onError={(e: any) => { showAlert(e) }}
                programConfig={programData!}
                sectionType={sectionName}
                selectedSectionDataStore={dataStoreData}
                empty={false}
                stagesToExport={[dataStoreData.registration.programStage]}
            />,
            divider: false,
            disabled: false,
        }
    ];

    return (
        <div className={styles.container}>
            <ButtonStrip className={styles.work_buttons}>
                {dataStoreData?.defaults?.allowSearching && <Tooltip title={orgUnit === null ? i18n.t("Please select an organisation unit before") : ""}>
                    <span>
                        <Button onClick={() => {
                            setOpenSearchEnrollment(true);
                        }} icon={<IconSearch24 />}>
                            <span className={styles.work_buttons_text}>
                                {
                                    i18n.t('Search by {{section}}', {
                                        section: `${i18n.t(sectionName)}s`,
                                    })
                                }
                            </span>
                        </Button>
                    </span>
                </Tooltip>}
                <Tooltip title={orgUnit === null ? i18n.t("Please select an organisation unit before") : ""}
                    onClick={() => setOpenSearchAdmission(true)}
                >
                    <span>
                        <Button icon={<IconAddCircle24 />}>
                            <span className={styles.work_buttons_text}>
                                {
                                    i18n.t('Enroll {{section}}', {
                                        section: `${i18n.t(sectionName)}`,
                                    })
                                }
                            </span>
                        </Button>
                    </span>
                </Tooltip>

                <Tooltip title={!areAllSelected() ? i18n.t("Please select all filters") : ""}>
                    <span>
                        <DropdownButton
                            name={<span className={styles.work_buttons_text}>{i18n.t("Bulk enrollment")}</span> as unknown as string}
                            disabled={!!(orgUnit == undefined || !areAllSelected() || academicYear == undefined)}
                            icon={<IconUserGroup16 />}
                            options={enrollmentOptions}
                        />
                    </span>
                </Tooltip>

            </ButtonStrip>

            {openSaveModal && <ModalManager
                i18n={i18n}
                saveMode='CREATE'
                open={openSaveModal}
                setOpen={setOpenSaveModal}
                formVariablesFields={formData}
                initialValues={formInitialValues}
                setFormInitialValues={setFormInitialValues}
                formFields={formFields({ formFieldsData: formData, sectionName: sectionName! })}
            />}

            {openSearchEnrollment &&
                <ModalSearchEnrollmentContent
                    open={openSearchEnrollment}
                    programConfig={programData!}
                    sectionName={sectionName}
                    setOpen={setOpenSearchEnrollment}
                    Form={Form}
                    setOpenNewEnrollmentModal={() => setOpenSaveModal(true)}
                    setFormInitialValues={(values: any) => setFormInitialValues(values)}
                />
            }

            {openSearchAdmission &&
                <ModalSearchAdmissionContent
                    open={openSearchAdmission}
                    programConfig={programData!}
                    sectionName={sectionName}
                    setOpen={setOpenSearchAdmission}
                    Form={Form}
                    setOpenNewAdmissionModal={() => setOpenSaveModal(true)}
                    setFormInitialValues={(values: any) => setFormInitialValues(values)}
                    onSelectTeiForEnrollment={onSelectTeiForEnrollment}
                />
            }

            {openEnrollSingleModal && (
                <EnrollSingleModal
                    i18n={i18n}
                    open={openEnrollSingleModal}
                    setOpen={setOpenEnrollSingleModal}
                    trackedEntityId={enrollStudentData.trackedEntityId}
                    enrollmentId={enrollStudentData.enrollmentId}
                    activeEnrollmentToComplete={enrollStudentData.activeEnrollmentToComplete || undefined}
                    activeEnrollmentEnrolledAt={enrollStudentData.activeEnrollmentEnrolledAt || undefined}
                    defaultAcademicYear={(schoolCalendar as any)?.defaults?.academicYear ?? academicYear ?? undefined}
                    academicYearDataElement={dataStoreData?.registration?.academicYear}
                    initialValues={enrollStudentData.initialValues}
                    formFields={formFields({ formFieldsData: formData, sectionName: sectionName! })}
                    formVariablesFields={formData}
                    onComplete={() => setOpenEnrollSingleModal(false)}
                />
            )}
        </div>
    )
}

export default EnrollmentActionsButtons
