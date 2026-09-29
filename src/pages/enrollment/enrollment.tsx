import { useRecoilValue } from 'recoil';
import React, { useEffect, useRef, useState } from "react";
import { IconDelete24, IconEdit24 } from "@dhis2/ui";
import { Table, InfoPage, useSchoolCalendarKey } from "dhis2-semis-components";
import ModalManager from "../../components/modal/saveEnrollment/ModalManager";
import { TableDataRefetch, Modules, ProgramConfig, D2I18n } from "dhis2-semis-types"
import useGetSelectedProgram from '../../hooks/config/useGetSelectedKeys';
import ModalManagerEnrollmentDelete from '../../components/modal/deleteEnrollment/ModalManager';
import { useBuildForm, useCheckFilters, useHeader, useTableData, useUrlParams, useViewPortWidth } from "dhis2-semis-functions";
import EnrollmentActionsButtons from "../../components/enrollmentButtons/EnrollmentActionsButtons";
import { formFields } from '../../utils/constants/form/enrollmentForm';

export default function EnrollmentsPage({ i18n }: { i18n: D2I18n }) {
    const { viewPortWidth } = useViewPortWidth()
    const { urlParameters, add, remove } = useUrlParams()
    const { program, dataStoreData } = useGetSelectedProgram()
    const schoolCalendar = useSchoolCalendarKey()
    const { academicYear, school, schoolName, sectionType } = urlParameters
    const [openEditModal, setOpenEditModal] = useState<boolean>(false)
    const [openDeleteModal, setOpenDeleteModal] = useState<boolean>(false)
    const { getData, tableData, loading } = useTableData({ module: Modules.Enrollment });
    const [filterState, setFilterState] = useState<{ dataElements: any, attributes: any }>({ attributes: [], dataElements: [] });
    const refetch = useRecoilValue(TableDataRefetch);
    const [pagination, setPagination] = useState<any>({ page: 1, pageSize: 50, totalPages: 0, totalElements: 0 })
    const { columns } = useHeader({ dataStoreData, programConfigData: program as unknown as ProgramConfig, programStage: "" });
    const { formData } = useBuildForm({ dataStoreData, programData: program, module: Modules.Enrollment, schoolCalendar });
    const enrollmentFormFields = formFields({ formFieldsData: formData, sectionName: sectionType! })
    const { getFilters } = useCheckFilters({ filters: (dataStoreData?.filters?.dataElements ?? []) as unknown as any })
    // Track actual filter values, including dynamically configured staff filters.
    const registryQuery = JSON.stringify({
        program: program?.id,
        orgUnit: school,
        baseProgramStage: dataStoreData?.registration?.programStage,
        attributeFilters: filterState.attributes.flat(),
        dataElementFilters: [
            academicYear && schoolCalendar?.academicYear ? `${schoolCalendar.academicYear}:in:${academicYear}` : null,
            ...getFilters().flat(),
            ...filterState.dataElements.flat(),
        ].filter((filter): filter is string => Boolean(filter)),
        order: dataStoreData.defaults.defaultOrder,
    });
    const previousRegistryQuery = useRef(registryQuery);

    const handleOpenModal = (e: Record<string, any>, type: "edit" | "delete",) => {
        add("trackedEntity", e?.row?.trackedEntity);
        add("enrollment", e?.row?.enrollmentId);

        if (type === "delete") {
            setOpenDeleteModal(true)
        } else {
            setOpenEditModal(true)
        }
    };

    useEffect(() => {
        setPagination((prev: any) => ({ ...prev, totalPages: tableData?.pagination?.totalPages, totalElements: tableData?.pagination?.totalElements }))
    }, [tableData])

    useEffect(() => {
        if (!openDeleteModal && !openEditModal) {
            remove("trackedEntity")
            remove("enrollment")
        }
    }, [openDeleteModal, openEditModal])

    const rowsActions = [
        { icon: <IconEdit24 />, color: '#277314', label: `${i18n.t("Edition")}`, disabled: false, disableOnInactive: true, loading: false, onClick: (e: any) => handleOpenModal(e, "edit") },
        { icon: <IconDelete24 />, color: '#d64d4d', label: `${i18n.t("Delete")}`, disabled: false, disableOnInactive: false, loading: false, onClick: (e: any) => { handleOpenModal(e, "delete") } },
    ];

    useEffect(() => {
        if (previousRegistryQuery.current !== registryQuery && pagination.page !== 1) {
            setPagination((prev: any) => ({ ...prev, page: 1 }));
            return;
        }
        previousRegistryQuery.current = registryQuery;
        if (school && academicYear && program?.id)
            void getData({
                ...JSON.parse(registryQuery),
                page: pagination?.page,
                pageSize: pagination?.pageSize,
            })
    }, [sectionType, registryQuery, pagination.page, pagination?.pageSize, refetch, school, academicYear])

    return (
        <div style={{ height: "85vh" }}>
            {
                !(Boolean(schoolName) && Boolean(school)) ?
                    <InfoPage
                        title={i18n.t("SEMIS-Enrollment")}
                        sections={[
                            {
                                sectionTitle: `${i18n.t("Follow the instructions to proceed")}:`,
                                instructions: [
                                    `${i18n.t("Select the Organization unit you want to view data")}`,
                                    `${i18n.t("Use global filters(Class, Grade and Academic Year)")}`
                                ]
                            }
                        ]}
                    />
                    :
                    <>
                        <Table
                            tableData={tableData.data}
                            programConfig={program!}
                            pagination={pagination}
                            setPagination={setPagination}
                            paginate={!loading}
                            title={i18n.t("Enrollments")}
                            viewPortWidth={viewPortWidth}
                            columns={columns}
                            rowAction={rowsActions}
                            defaultFilterNumber={3}
                            showRowActions
                            filterState={filterState}
                            loading={loading}
                            rightElements={<EnrollmentActionsButtons i18n={i18n} />}
                            setFilterState={setFilterState}
                        />
                        {openDeleteModal && <ModalManagerEnrollmentDelete i18n={i18n} open={openDeleteModal} setOpen={setOpenDeleteModal} saveMode="UPDATE" />}
                        {openEditModal && <ModalManager i18n={i18n} formVariablesFields={formData} formFields={enrollmentFormFields} open={openEditModal} setOpen={setOpenEditModal} saveMode="UPDATE" />}
                    </>
            }
        </div>
    )
}
