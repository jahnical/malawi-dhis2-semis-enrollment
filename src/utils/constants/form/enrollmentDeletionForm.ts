import { format } from "date-fns";
import { capitalizeString } from "dhis2-semis-functions";
import { VariablesTypes } from "dhis2-semis-types";

const staticForm = () => {
  return {
    registeringSchool: {
      required: true,
      name: "registerschoolstaticform",
      labelName: "Registering School",
      valueType: "TEXT",
      options: undefined,
      disabled: true,
      pattern: "",
      visible: true,
      description: "Registering School",
      searchable: false,
      error: false,
      programStage: "",
      content: "",
      id: "registerschoolstaticform",
      displayName: "Registering School",
      header: "Registering School",
      type: VariablesTypes.DataElement,
      assignedValue: undefined
    },
    enrollmentDate: {
      required: true,
      name: "enrollment_date",
      labelName: "Enrollment date",
      valueType: "DATE",
      options: undefined,
      disabled: false,
      pattern: "",
      visible: true,
      description: "Enrollment date",
      searchable: false,
      error: false,
      programStage: "",
      content: "",
      id: "enrollment_date",
      displayName: "Enrollment date",
      header: "Enrollment date",
      type: VariablesTypes.DataElement,
      assignedValue: format(new Date(), "yyyy-MM-dd")
    }
  }
}

function enrollmentDeletionFormField({ formFieldsData, sectionName }: { formFieldsData: any[], sectionName: string }) {

  const [enrollmentDetails = [], studentsProfile = [], socioEconomicDetails = []] = formFieldsData;


  const updatedEnrollmentData = enrollmentDetails.map((item: any) => {
    return { ...item, disabled: true, required: false };
  });

  const updatedDataProfile = studentsProfile
    .filter((item: any) => item?.searchable || item?.unique || item?.required)
    .map((item: any) => ({ ...item, disabled: true, required: false }));

  return [
    {
      name: `${capitalizeString(sectionName === 'student' ? 'learner' : sectionName)} Profile`,
      visible: true,
      fields: [
        ...updatedDataProfile
      ]
    },
    {
      name: "Enrollment Details",
      visible: true,
      fields: [
        ...updatedEnrollmentData,
      ]
    }
  ];
}

export { enrollmentDeletionFormField, staticForm };
